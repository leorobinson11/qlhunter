import "../styles/sitemap.css"
import { useState } from "react";

const TreeNode = ({ url }) => {
  return <li> {url} </li>
}

const TreeParent = ({ node, treeData }) => {  
    const [isOpen, setIsOpen] = useState(false);
    const handleToggle = () => setIsOpen(!isOpen);
    const children = treeData[node] || [];
    return (
      <div>
        <div>
          {children.length > 0 && (
            <span onClick={handleToggle} style={{ cursor: 'pointer' }}>
              {isOpen ? '[-]' : '[+]'}
            </span>
          )}
          <span>{node}</span>
        </div>
        {isOpen && children.length > 0 && (
          <div>
            {children.map((data) => (
              <TreeNode url={data} />
            ))}
          </div>
        )}
      </div>
    );
};

const TreeView = ({ data }) => {
    const rootNodes = Object.keys(data).filter(key => data[key].length > 0);
    return (
      <div>
        {rootNodes.map((node) => (
          <TreeParent key={node} node={node} treeData={data} />
        ))}
      </div>
    );
};

const Sitemap = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getGraphql_endpoints = async () => {
    setLoading(true);
    setError(null);

    const checkbox = document.getElementById("enumerate-subdomains")
    const inputbox = document.getElementById("rootdomain")
    const root = inputbox.value;
    inputbox.value = ""

    var subdomains;

    try {
      if (checkbox.checked) {
        const subdomains_req = await fetch("http://127.0.0.1:5000/api/subdomains?" + new URLSearchParams({ "root":root }))
        subdomains = await subdomains_req.json()
      } else {
        subdomains = [root]
      }

      for (let subdomain of subdomains) {
        const res = await fetch("http://127.0.0.1:5000/api/endpoints?" + new URLSearchParams({ "root":subdomain }))
        if (!res.ok) {
          throw new Error("Error fuzzing for graphql endpoints!")
        }
        const endpoints = await res.json();
        setData((prevData) => {
          const updatedData = { ...prevData };
          Object.keys(endpoints).forEach(key => {
            if (!updatedData[key]) {
              updatedData[key] = data[key];
            }
          });
          return updatedData;
        });
      }

    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    };
  };

  return (
    <div class="sitemap-section-container">
      <h1> Sitemap </h1>
      <div class="input-box">
        <input id="rootdomain" placeholder="Domain"></input>
        <button onClick={getGraphql_endpoints}> Find Endpoints </button>
        <label for="enumerate-subdomains"> Enumerate Subdomains </label>
        <input type="checkbox" id="enumerate-subdomains" />
      </div>
      <div id="domains">
        { loading && <p> Loading Graphql endpoints ... </p> }
        { error && <p> {error.message} </p> }
        <TreeView data={data} />
      </div>
    </div>
    );
};

export default Sitemap;