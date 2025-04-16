import networkx as nx
import pandas as pd
import numpy as np
import community as community_louvain
from typing import Dict, List, Any, Optional, Tuple, Union
import json
import os
from datetime import datetime

class NetworkAnalysisService:
    """Service for network analysis using NetworkX."""
    
    @staticmethod
    def create_network_from_data(data: Dict[str, Any], directed: bool = False, weighted: bool = False) -> nx.Graph:
        """
        Create a NetworkX graph from input data.
        
        Args:
            data: Dictionary containing nodes and edges information
            directed: Whether the graph is directed
            weighted: Whether the graph has weighted edges
            
        Returns:
            NetworkX graph object
        """
        if directed:
            G = nx.DiGraph()
        else:
            G = nx.Graph()
            
        # Add nodes with attributes
        if "nodes" in data:
            for node in data["nodes"]:
                node_id = node.pop("id")
                G.add_node(node_id, **node)
        
        # Add edges with attributes
        if "edges" in data:
            for edge in data["edges"]:
                source = edge.pop("source")
                target = edge.pop("target")
                
                # Handle weight attribute if specified
                if weighted and "weight" in edge:
                    weight = edge.pop("weight")
                    G.add_edge(source, target, weight=weight, **edge)
                else:
                    G.add_edge(source, target, **edge)
        
        return G
    
    @staticmethod
    def calculate_network_metrics(G: nx.Graph) -> Dict[str, Any]:
        """
        Calculate common network metrics for a graph.
        
        Args:
            G: NetworkX graph object
            
        Returns:
            Dictionary containing calculated metrics
        """
        metrics = {
            "global_metrics": {},
            "node_metrics": {}
        }
        
        # Calculate global metrics
        metrics["global_metrics"]["node_count"] = G.number_of_nodes()
        metrics["global_metrics"]["edge_count"] = G.number_of_edges()
        metrics["global_metrics"]["density"] = nx.density(G)
        
        # Try to calculate metrics that might fail for certain graph structures
        try:
            metrics["global_metrics"]["average_clustering"] = nx.average_clustering(G)
        except:
            metrics["global_metrics"]["average_clustering"] = None
            
        try:
            # Calculate connected components for undirected graphs
            if not G.is_directed():
                connected_components = list(nx.connected_components(G))
                metrics["global_metrics"]["connected_components"] = len(connected_components)
                
                # Only calculate average path length for connected graphs
                if len(connected_components) == 1:
                    metrics["global_metrics"]["average_path_length"] = nx.average_shortest_path_length(G)
                    metrics["global_metrics"]["diameter"] = nx.diameter(G)
                else:
                    # Get the largest connected component
                    largest_cc = max(connected_components, key=len)
                    largest_subgraph = G.subgraph(largest_cc)
                    metrics["global_metrics"]["average_path_length_largest_cc"] = nx.average_shortest_path_length(largest_subgraph)
                    metrics["global_metrics"]["diameter_largest_cc"] = nx.diameter(largest_subgraph)
            else:
                # For directed graphs, check strong connectivity
                strongly_connected = list(nx.strongly_connected_components(G))
                metrics["global_metrics"]["strongly_connected_components"] = len(strongly_connected)
                
                # If the graph is strongly connected, calculate path metrics
                if len(strongly_connected) == 1:
                    metrics["global_metrics"]["average_path_length"] = nx.average_shortest_path_length(G)
                    metrics["global_metrics"]["diameter"] = nx.diameter(G)
                else:
                    # Get the largest strongly connected component
                    largest_scc = max(strongly_connected, key=len)
                    largest_subgraph = G.subgraph(largest_scc)
                    metrics["global_metrics"]["average_path_length_largest_scc"] = nx.average_shortest_path_length(largest_subgraph)
                    metrics["global_metrics"]["diameter_largest_scc"] = nx.diameter(largest_subgraph)
        except Exception as e:
            metrics["global_metrics"]["connectivity_error"] = str(e)
        
        # Calculate node-level metrics
        try:
            degree_centrality = nx.degree_centrality(G)
            metrics["node_metrics"]["degree_centrality"] = degree_centrality
        except:
            pass
            
        try:
            betweenness_centrality = nx.betweenness_centrality(G)
            metrics["node_metrics"]["betweenness_centrality"] = betweenness_centrality
        except:
            pass
            
        try:
            closeness_centrality = nx.closeness_centrality(G)
            metrics["node_metrics"]["closeness_centrality"] = closeness_centrality
        except:
            pass
            
        try:
            eigenvector_centrality = nx.eigenvector_centrality(G, max_iter=1000)
            metrics["node_metrics"]["eigenvector_centrality"] = eigenvector_centrality
        except:
            pass
        
        try:
            clustering_coefficient = nx.clustering(G)
            metrics["node_metrics"]["clustering_coefficient"] = clustering_coefficient
        except:
            pass
        
        # Structural holes metrics (effective size)
        try:
            effective_size = {node: nx.effective_size(G, node) for node in G.nodes()}
            metrics["node_metrics"]["effective_size"] = effective_size
        except:
            pass
        
        # Constraint (Burt's constraint)
        try:
            constraint = nx.constraint(G)
            metrics["node_metrics"]["constraint"] = constraint
        except:
            pass
        
        return metrics
    
    @staticmethod
    def detect_communities(G: nx.Graph, algorithm: str = "louvain") -> Dict[str, Any]:
        """
        Detect communities in a network using the specified algorithm.
        
        Args:
            G: NetworkX graph object
            algorithm: Community detection algorithm to use ("louvain" or "girvan_newman")
            
        Returns:
            Dictionary containing community detection results
        """
        results = {
            "algorithm": algorithm,
            "communities": {},
            "node_community": {}
        }
        
        # Only works with undirected graphs
        if G.is_directed():
            undirected_G = nx.Graph(G)
        else:
            undirected_G = G
        
        if algorithm == "louvain":
            # Use the Louvain method (python-louvain package)
            partition = community_louvain.best_partition(undirected_G)
            communities = {}
            
            # Organize nodes by community
            for node, community_id in partition.items():
                community_id_str = str(community_id)
                if community_id_str not in communities:
                    communities[community_id_str] = []
                communities[community_id_str].append(node)
            
            # Calculate community statistics
            community_stats = {}
            for comm_id, nodes in communities.items():
                subgraph = undirected_G.subgraph(nodes)
                community_stats[comm_id] = {
                    "size": len(nodes),
                    "density": nx.density(subgraph),
                    "nodes": nodes
                }
            
            # Calculate modularity
            modularity = community_louvain.modularity(partition, undirected_G)
            
            results["communities"] = community_stats
            results["node_community"] = {node: str(comm) for node, comm in partition.items()}
            results["num_communities"] = len(communities)
            results["modularity"] = modularity
            
        elif algorithm == "girvan_newman":
            # Use Girvan-Newman algorithm
            # Note: This can be computationally expensive for large networks
            try:
                # Get the first level of the hierarchy (adjust as needed)
                comp = nx.community.girvan_newman(undirected_G)
                communities = list(next(comp))
                
                community_stats = {}
                node_to_community = {}
                
                for i, comm in enumerate(communities):
                    comm_id = str(i)
                    community_stats[comm_id] = {
                        "size": len(comm),
                        "density": nx.density(undirected_G.subgraph(comm)),
                        "nodes": list(comm)
                    }
                    
                    # Map nodes to communities
                    for node in comm:
                        node_to_community[node] = comm_id
                
                results["communities"] = community_stats
                results["node_community"] = node_to_community
                results["num_communities"] = len(communities)
                
                # Calculate modularity (need to convert to required format for modularity function)
                partition = {node: int(comm) for node, comm in node_to_community.items()}
                modularity = community_louvain.modularity(partition, undirected_G)
                results["modularity"] = modularity
                
            except Exception as e:
                results["error"] = str(e)
        
        return results
    
    @staticmethod
    def predict_links(G: nx.Graph, method: str = "common_neighbors", k: int = 10) -> List[Tuple[Any, Any, float]]:
        """
        Predict missing links in a network.
        
        Args:
            G: NetworkX graph object
            method: Link prediction method to use
            k: Number of top predictions to return
            
        Returns:
            List of tuples (node1, node2, score) for predicted links
        """
        # Get all non-existing edges
        all_possible_edges = list(nx.non_edges(G))
        
        if method == "common_neighbors":
            # Calculate common neighbors for all possible edges
            preds = nx.common_neighbor_centrality(G, ebunch=all_possible_edges)
            preds_list = [(u, v, score) for (u, v), score in preds]
            
        elif method == "jaccard":
            # Calculate Jaccard coefficient for all possible edges
            preds = nx.jaccard_coefficient(G, ebunch=all_possible_edges)
            preds_list = [(u, v, score) for u, v, score in preds]
            
        elif method == "adamic_adar":
            # Calculate Adamic-Adar index for all possible edges
            preds = nx.adamic_adar_index(G, ebunch=all_possible_edges)
            preds_list = [(u, v, score) for u, v, score in preds]
            
        elif method == "preferential_attachment":
            # Calculate preferential attachment scores for all possible edges
            preds = nx.preferential_attachment(G, ebunch=all_possible_edges)
            preds_list = [(u, v, score) for u, v, score in preds]
            
        else:
            raise ValueError(f"Unsupported link prediction method: {method}")
        
        # Sort by score in descending order and get top k
        preds_list.sort(key=lambda x: x[2], reverse=True)
        return preds_list[:k]
    
    @staticmethod
    def calculate_homophily(G: nx.Graph, attribute: str) -> Dict[str, float]:
        """
        Calculate homophily metrics for a given node attribute.
        
        Args:
            G: NetworkX graph object
            attribute: Node attribute to analyze for homophily
            
        Returns:
            Dictionary containing homophily metrics
        """
        results = {}
        
        # Check if all nodes have the attribute
        if not all(attribute in G.nodes[node] for node in G.nodes):
            raise ValueError(f"Not all nodes have the attribute: {attribute}")
        
        # Get all unique attribute values
        attribute_values = set(nx.get_node_attributes(G, attribute).values())
        
        # Calculate homophily measures for each attribute value
        for value in attribute_values:
            # Get nodes with this attribute value
            nodes_with_value = [node for node in G.nodes if G.nodes[node][attribute] == value]
            
            # Skip if there are no nodes with this value
            if len(nodes_with_value) == 0:
                continue
                
            # Create a subgraph of nodes with this value
            subgraph = G.subgraph(nodes_with_value)
            
            # Count internal edges (within the value group)
            internal_edges = subgraph.number_of_edges()
            
            # Count all edges connected to nodes with this value
            total_edges = sum(G.degree(node) for node in nodes_with_value)
            
            # Calculate E-I index: (external - internal) / (external + internal)
            # external = total - 2*internal (for undirected graphs)
            external_edges = total_edges - 2*internal_edges
            
            if total_edges > 0:
                ei_index = (external_edges - internal_edges) / total_edges
            else:
                ei_index = 0
                
            # Calculate homophily ratio (internal / total)
            if total_edges > 0:
                homophily_ratio = (2 * internal_edges) / total_edges
            else:
                homophily_ratio = 0
                
            results[str(value)] = {
                "node_count": len(nodes_with_value),
                "internal_edges": internal_edges,
                "external_edges": external_edges,
                "ei_index": ei_index,
                "homophily_ratio": homophily_ratio
            }
            
        # Calculate overall homophily metrics
        attribute_distribution = {
            value: len([node for node in G.nodes if G.nodes[node][attribute] == value]) / G.number_of_nodes()
            for value in attribute_values
        }
        
        results["overall"] = {
            "attribute_distribution": attribute_distribution,
            "value_count": len(attribute_values)
        }
            
        return results
    
    @staticmethod
    def export_to_formats(G: nx.Graph, formats: List[str] = ["graphml", "gexf", "json"]) -> Dict[str, str]:
        """
        Export a network to various file formats.
        
        Args:
            G: NetworkX graph object
            formats: List of formats to export
            
        Returns:
            Dictionary mapping format to file path
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results = {}
        
        os.makedirs("exports", exist_ok=True)
        
        for fmt in formats:
            if fmt == "graphml":
                file_path = f"exports/network_{timestamp}.graphml"
                nx.write_graphml(G, file_path)
                results["graphml"] = file_path
                
            elif fmt == "gexf":
                file_path = f"exports/network_{timestamp}.gexf"
                nx.write_gexf(G, file_path)
                results["gexf"] = file_path
                
            elif fmt == "json":
                file_path = f"exports/network_{timestamp}.json"
                data = nx.node_link_data(G)
                with open(file_path, 'w') as f:
                    json.dump(data, f)
                results["json"] = file_path
                
            elif fmt == "edgelist":
                file_path = f"exports/network_{timestamp}.edgelist"
                nx.write_edgelist(G, file_path)
                results["edgelist"] = file_path
                
        return results
    
    @staticmethod
    def prepare_network_for_visualization(G: nx.Graph, layout: str = "force", node_size_attr: Optional[str] = None, 
                                         node_color_attr: Optional[str] = None) -> Dict[str, Any]:
        """
        Prepare network data for visualization.
        
        Args:
            G: NetworkX graph object
            layout: Layout algorithm to use
            node_size_attr: Node attribute to use for sizing nodes
            node_color_attr: Node attribute to use for coloring nodes
            
        Returns:
            Dictionary with visualization-ready data
        """
        # Calculate layout positions
        if layout == "force":
            pos = nx.spring_layout(G)
        elif layout == "circular":
            pos = nx.circular_layout(G)
        elif layout == "kamada_kawai":
            try:
                pos = nx.kamada_kawai_layout(G)
            except:
                # Fall back to spring layout for disconnected graphs
                pos = nx.spring_layout(G)
        elif layout == "spectral":
            try:
                pos = nx.spectral_layout(G)
            except:
                pos = nx.spring_layout(G)
        else:
            pos = nx.spring_layout(G)  # Default to spring layout
            
        # Convert positions to lists for JSON serialization
        positions = {node: {"x": float(coords[0]), "y": float(coords[1])} for node, coords in pos.items()}
        
        # Prepare nodes with attributes
        nodes = []
        for node in G.nodes():
            node_data = {
                "id": node,
                "label": str(node),
                "position": positions[node]
            }
            
            # Add all node attributes
            node_data.update(G.nodes[node])
            
            # Add calculated properties if requested
            if node_size_attr:
                if node_size_attr in G.nodes[node]:
                    node_data["size"] = G.nodes[node][node_size_attr]
            
            nodes.append(node_data)
            
        # Prepare edges with attributes
        edges = []
        for source, target, data in G.edges(data=True):
            edge_data = {
                "source": source,
                "target": target
            }
            
            # Add all edge attributes
            edge_data.update(data)
            
            edges.append(edge_data)
            
        return {
            "nodes": nodes,
            "edges": edges,
            "directed": G.is_directed(),
            "node_count": G.number_of_nodes(),
            "edge_count": G.number_of_edges()
        }