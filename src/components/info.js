import '../styles/info.css'
import React, { useState } from 'react';

const OpenPorts = ({ data }) => {
    return (
        <div>
            <h3> Open Ports </h3>
            {data.length === 0 ? (
                <p>No open ports found.</p>
            ) : (
                data.map((port) => (
                    <li> {port["port"]} --&#x3e; {port["service"]} </li>
                ))
            )}
        </div>
    );
}

const VunMatrix = ({ data }) => {
    return (
        <div>
            <h3> Engine: {data.engine || 'N/A'} </h3>
            {data.matrix && Object.entries(data.matrix).length > 0 ? (
                Object.entries(data.matrix).map(([key, value], index) => (
                    <p key={index}> <b>{key}:</b> {value} </p>
                ))
            ) : (
                <p>No matrix data available.</p>
            )}
        </div>
    )
}
const Info = () => {
    const [ports, setPorts] = useState([]);
    const [fingerprint, setFingerprint] = useState({});
    const [loadingPorts, setLoadingPorts] = useState(false);
    const [loadingFingerprint, setLoadingFingerprint] = useState(false);
    const [error, setError] = useState(null);

    const call_open_ports_api = async (url) => {
        setLoadingPorts(true);
        try {
            const res = await fetch("http://127.0.0.1:5000/api/info/open-ports?" + new URLSearchParams({ url }));
            if (!res.ok) {
                throw new Error("Error trying to fetch open ports data!");
            }
            const data = await res.json();
            setPorts(data);
        } catch (error) {
            setError(error);
        } finally {
            setLoadingPorts(false);
        }
    };

    const call_vun_matrix_api = async (url) => {
        setLoadingFingerprint(true);
        try {
            const res = await fetch("http://127.0.0.1:5000/api/info/vun-matrix?" + new URLSearchParams({ url }));
            if (!res.ok) {
                throw new Error("Error trying to fetch vulnerability matrix data!");
            }
            const data = await res.json();
            setFingerprint(data);
        } catch (error) {
            setError(error);
        } finally {
            setLoadingFingerprint(false);
        }
    };

    const call_api = () => {
        setError(null);
        //const url = "https://mcstg2.shopforcadbury.com/graphql";

        var inputbox = document.getElementById("graphqlendpoint")
        const url = inputbox.value;
        inputbox.value = ""

        call_open_ports_api(url);
        call_vun_matrix_api(url);
    };

    return (
        <div className="info-section-container">
            <div>
                <h1>Info</h1>
                <input id="domain" placeholder="Domain"></input>
                <button onClick={call_api}>Fingerprint</button>
            </div>
            <div>
                {loadingPorts && <p>Loading open ports...</p>}
                {loadingFingerprint && <p>Loading vulnerability matrix...</p>}
                {error && <p>{error.message}</p>}
                <OpenPorts data={ports} />
                <VunMatrix data={fingerprint} />
            </div>
        </div>
    );
};

export default Info;