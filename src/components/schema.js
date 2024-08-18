import '../styles/schema.css'
import React, { useState } from 'react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import { Handle, ReactFlowProvider } from 'react-flow-renderer';
import '@xyflow/react/dist/style.css';

const CostumnNode = ({ data }) => {
    return (
        <div class="node-container">
            <h3> {data.label} </h3>
            <table class="node-table" >
                <tbody>
                    {data.fields.map((item, index) => (
                        <tr key={index}>
                            <td> {item.name}{item.args.length>0 && `(${item.args[0].name}:${item.args[0].type})`}: {item.type}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Handle type="target" position="left" style={{ background: '#555' }} />
            <Handle type="source" position="right" style={{ background: '#555' }} />
        </div>
    );
};

const Graph = ({ nodes, edges }) => {
    return (
        <div style={{ height: '650px', width:'100%' }}>
            <ReactFlowProvider>
                <ReactFlow nodes={nodes} edges={edges} nodeTypes={{custom: CostumnNode}}>
                    <Background />
                    <Controls />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
};

function getTypeName(type) {
    if (type.kind === 'NON_NULL') {
      return getTypeName(type.ofType);
    } else if (type.kind === 'LIST') {
        return `[${getTypeName(type.ofType)}]`;
    }
    return type.name;
}

const topologicalSort = (nodes, edges) => {
    // change sorting method 
    
    const inDegree = {};
    const adjList = {};

    nodes.forEach((node) => {
        inDegree[node.id] = 0;
        adjList[node.id] = [];
    })

    edges.forEach((edge) => {
        adjList[edge.source].push(edge.target)
        inDegree[edge.target]++;
    })

    const queue = [];
    const sorted = [];
    
    // Add nodes with 0 in-degree to the queue
    nodes.forEach(node => {
        if (inDegree[node.id] === 0) {
            queue.push(node.id);
        }
    });
    
    // Process the queue
    while (queue.length > 0) {
        const current = queue.shift();
        sorted.push(current);
        
        adjList[current].forEach(neighbor => {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        });
    }
    
    return sorted
}


const schemaToGraph = (schema) => {
    const nodes = [];
    const edges = [];

    let types = schema.data.__schema.types
    types.forEach(type => {
        if (type.kind == "OBJECT" && !type.name.startsWith("__")) {
            nodes.push({
                id: type.name,
                type: 'custom',
                position: { x: 0, y: 0 },
                data: { 
                    label: type.name, 
                    fields: type.fields.map((field) => {
                        return {name: field.name, type: getTypeName(field.type), args: field.args.map((arg) => {
                            return {name: arg.name, type: getTypeName(arg.type)}
                        })}
                    })
                }
            });

            type.fields.forEach((field) => {
                if (field.type.kind == "OBJECT") {
                    edges.push({
                        id: `${type.name}-${field.name}`,
                        source: type.name,
                        target:  field.name[0].toUpperCase() + field.name.slice(1),
                        animated: false
                    })
                };  
            });
        };
    });

    const sortedNodes = topologicalSort(nodes, edges);
    console.log(sortedNodes)

    nodes.forEach((node) => {
        node.position.x = 600 * (sortedNodes.indexOf(node.id) + 1)
    });

    return { nodes, edges };
}


const Schema = () => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const displaySchema = async () => {
        setLoading(true);
        setError(null);

        //const url = "https://lttransactions.production.linktr.ee/graphql"//"https://mcstg2.shopforcadbury.com/graphql"//
        var inputbox = document.getElementById("graphqlendpoint")
        const url = inputbox.value;
        inputbox.value = ""

        try {
            const res = await fetch("http://127.0.0.1:5000/api/schema?" + new URLSearchParams({ url:url }))
            if (!res.ok) {
                throw new Error("Error trying to fetch data!")
            }
            const data = await res.json();
            const { nodes, edges } = schemaToGraph(data);
            setNodes(nodes);
            setEdges(edges);

        } catch (error) {
            setError(error);
        } finally {
            setLoading(false);
        };

        setLoading(false)
    };

    return (
        <div class="schema-section-container"> 
            <div>
                <h1> Schema </h1>
                <input id="graphqlendpoint" placeholder="Enpoint"></input>
                <button onClick={displaySchema}> Load Schema </button> 
            </div>
            <div>
                { loading && <p> Loading Schema ... </p> }
                { error && <p> {error.message} </p> }
                <Graph nodes={nodes} edges={edges}/>
            </div>
        </div>
    );
};

export default Schema;