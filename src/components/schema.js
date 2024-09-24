import '../styles/schema.css'
import React, { useState } from 'react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import { Handle, ReactFlowProvider } from 'react-flow-renderer';
import '@xyflow/react/dist/style.css';
import { LoneAnonymousOperationRule } from 'graphql';

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

const SugiyamaSort = (nodes, edges) => {
    const CreateLayers = ( nodes ) => {
        // asining each node a layer one higher than the highest layer of the its incomming nodes
        // y(v) := max {y(u) | uv e E} + 1
    
        const FindLayer = (node) => {
            let incommingLayers;
            if (node.layer) {
                return node.layer
            } else if (nodeIncomingEdges[node.id].length == 0) {
                node.layer = 0
                return 0
            } else {
                incommingLayers = nodeIncomingEdges[node.id].map(incommingnode => {
                     return incommingnode.layer || FindLayer( incommingnode)
                })
            }
            let layer = Math.max(... incommingLayers) + 1
            node.layer = layer
            return layer
        }
        var layers = {};
        nodes.forEach(node => {
            let layer = FindLayer(node)
            layers[layer] = (layers[layer] || []).concat([node])
        })   
        return layers 
    };

    const minimizeCrossing = ( layers ) => {
        // arranging the nodes within the layers in a way that minimizes the crossings
        // nodes are sorted by the avarage x of the their incomming nodes
        const AvarageofIncommingNodes = (node) => {
            if (nodeIncomingEdges[node].length == 0) return 0;
            const nodeheights = nodeIncomingEdges[node].map(incommingnode => {
                return incommingnode.height | AvarageofIncommingNodes(incommingnode)
            })
            const avarage_height = nodeheights.reduce((partialSum, a) => partialSum + a, 0) / nodeIncomingEdges[node].length
            node.height =  avarage_height
            return avarage_height
        };
        
        Object.keys(layers).forEach(layer => {
            let layer_nodes = layers[layer]
            if (layer > 0) {
                layer_nodes.sort((node1, node2) => {
                    let height1 = AvarageofIncommingNodes(node1)
                    let height2 = AvarageofIncommingNodes(node2)
                    return height1 - height2;
                });
            }
            layer_nodes.forEach((node,index) => {
                node.height = index
            })
        })
        
    };
    
    const asignPositions = ( nodes ) => {
        nodes.forEach(node => {
            node.position.x = node.layer * 500
            node.position.y = node.height * 200
        })
    }
    
    const nodeIncomingEdges = {}
    nodes.forEach(node => {
        nodeIncomingEdges[node.id] = []
    })
    edges.forEach(edge => {
        nodeIncomingEdges[edge.target].push(nodes.find(node => node.id == edge.source))
    })
    // asign layers
    const layers = CreateLayers(nodes, edges);
    minimizeCrossing(layers)
    asignPositions(nodes)

    return nodes
}

const schemaToGraph = (schema) => {
    var nodes = [];
    var edges = [];

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

    //nodes = SugiyamaSort(nodes, edges)

    console.log(nodes)
    console.log(edges)
    
    const sortedNodes = topologicalSort(nodes, edges);

    nodes.forEach((node) => {
        node.position.x = 600 * sortedNodes.indexOf(node.id)
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