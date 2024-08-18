from flask import Flask, request
from flask_cors import CORS
from flask_caching import Cache

from endpoint_finder import Endpoint_Finder, Subdomain_Finder
from schema_discovery import Schema_parser

from urllib.parse import urlparse
import nmap3
from glom import glom

import subprocess
import re
from bs4 import BeautifulSoup
import requests
        

cache_config = {
    "DEBUG": True,          
    "CACHE_TYPE": "SimpleCache",  
    "CACHE_DEFAULT_TIMEOUT": 300
}

app = Flask(__name__)
CORS(app)
app.config.from_mapping(cache_config)
cache = Cache(app)

@app.route('/api/fuzz')
def fuzz():
    pass

@app.route('/api/info/vun-matrix')
def vun_matrix():
    url = "https://mcstg2.shopforcadbury.com/graphql"
    fingerprint = str(subprocess.check_output(['python', 'tools/graphw00f/main.py', '-f', "-t", url]))
    engine = re.search(r"GraphQL Engine: \((.+)\)", fingerprint).group(1)
    attack_matrix_url = re.search(r"Attack Surface Matrix:\s+(https?://[^\s]+)", fingerprint).group(1)
    path = "https://raw.githubusercontent.com/nicholasaleks/graphql-threat-matrix/master/implementations/" + attack_matrix_url.split('/')[-1]
    res = requests.get(path)
    soup = BeautifulSoup(res.content, "html.parser")
    vun_matrix_table, validations_table = soup.find_all("table")
     
    matrix = {}
    rows = vun_matrix_table.find_all("tr")
    for (key, value) in zip(rows[0].find_all("th"), rows[1].find_all("td")):
        matrix.update({ key.text : value.text })

    # add code for extracting validation table
        
    return {"engine": engine, "matrix":matrix}

@app.route('/api/info/open-ports')
def open_ports():
    url = urlparse(request.args.get("url"))
    nmap = nmap3.Nmap()
    res = nmap.scan_top_ports(url.hostname)
    ports = glom(res, '**.ports')[0]
    open_ports = [{"port":port["portid"], "service":port["service"]["name"]} for port in ports if port["state"] == "open"]
    return open_ports

@app.route('/api/schema')
@cache.cached(1000, query_string=True)
def schema() -> dict:
    #return {"query":"some test data"}
    url = request.args.get("url")
    parser = Schema_parser()
    return parser.basic_introspection(url)

@app.route('/api/subdomains')
def Subdomains() -> list:
    root = request.args.get("root")
    parser = Subdomain_Finder()
    return parser.enumerate_subdomains(root)

@app.route('/api/endpoints')
def Graphql_endpoints() -> dict:
    # returns graphql endpoints
    #return {"graph.linktr.ee" : [r"\graphql"], "linktr.ee" : [r"\api\graphql", r"\api\v2\graphql"]} #  test dataset
    root = request.args.get("root")
    parser = Endpoint_Finder()
    endpoints = {root:parser.enumerate_endpoints(root)}
    return endpoints