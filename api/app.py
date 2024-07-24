import json
import re
import threading
import requests
from flask import Flask, request

class Graphql_parser:
    def __init__(self) -> None:
        pass

    def query(self, url, query="") -> requests.Response:
        res = requests.post(url, json={"query":query}, allow_redirects=False)
        return res

    def isGraphql(self, url) -> bool:
        # Test if json is returned for __typname query
        res = self.query(url, "query{__typename}")
        if res.status_code != 200:
            return False
        if not "application/json" in res.headers['content-type']:
            return False
        if bool(re.match(".+(data|errors|__schema|__typename).+", res.text)):
            return True
        else:
            return False
        

app = Flask(__name__)

@app.route('/api/endpoints')
def Graphql_endpoints():
    # fuzzing for valid graphql endpoints

    # root domain
    root = request.args.get("root")

    # if not present False otherwise True, if subdomain enumeration should be performed
    subdomains = bool(request.args.get("subdomains"))

    parser = Graphql_parser()
    endpoints = []
    with open("wordlists/directories.txt", "r") as file:
        for path in file.readlines():
            endpoint = f"https://{root.strip()}/{path.strip()}"
            if parser.isGraphql(f"https://{root.strip()}/{path.strip()}"):
                endpoints.append(endpoint)

    return endpoints 


