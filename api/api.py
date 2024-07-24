import json
import re
from threading import Thread
import requests
from flask import Flask, request
from bs4 import BeautifulSoup

class Endpoint_Finder:
    def __init__(self) -> None:
        pass

    def subdomains(self, root) -> list:
        # enumerating subdomains
        res = requests.get(f"https://crt.sh/?q={root}")
        soup = BeautifulSoup(res.text, "html.parser")

        table = soup.find_all("table")[1]
        rows = table.find_all("tr")
        subdomains = []
        for row in rows:
            cells = row.find_all("td")
            if len(cells) == 7:
                subdomain = cells[4].text.replace('*.', '')
                if root in subdomain and not subdomain in subdomains:
                    subdomains.append(subdomain)
        return subdomains

    def query(self, url, query="") -> requests.Response:
        # graphql query
        res = requests.post(url, json={"query":query}, allow_redirects=False)
        return res

    def isGraphql(self, url) -> bool:
        # Test if endpoint is graphql by its response to __typename query
        res = self.query(url, "query{__typename}")
        if res.status_code != 200:
            return False
        if not "application/json" in res.headers['content-type']:
            return False
        if bool(re.match(".+(data|errors|__schema|__typename).+", res.text)):
            return True
        else:
            return False
        
    def sub_enumerate_endpoints(self, root, path):
        #subfunction of enumerate endpoints function -> fead into threads
        endpoint = f"https://{root.strip()}/{path.strip()}"
        if self.isGraphql(f"https://{root.strip()}/{path.strip()}"):
            self.endpoints.append(endpoint)
    
    def enumerate_endpoints(self, domain) -> list:
        # finding graphql endpoints on root domain
        self.endpoints = []
        threads = []
        # loading the posible graphql directories
        with open("wordlists/directories.txt", "r") as file:
            for path in file.readlines():
                thread = Thread(target=self.sub_enumerate_endpoints, args=(domain, path, ))
                thread.start()
                threads.append(thread)
        for thread in threads:
            thread.join()
        return self.endpoints
    
    def sub_enumerate_endpoints_for_all_subdomains(self, subdomain):
        self.endpoints_map.update({
                subdomain : self.enumerate_endpoints(subdomain)
        })
    
    def enumerate_endpoints_for_all_subdomains(self, root) -> dict:
        # finds all graphql endpoints of all subdomains of a rootdomain
        self.endpoints_map = {}
        threads = []
        for subdomain in self.subdomains(root):
            thread = Thread(target=self.sub_enumerate_endpoints_for_all_subdomains, args=(subdomain, ))
            thread.start()
            threads.append(thread)
        for thread in threads:
            thread.join()
        return self.endpoints_map
            
        

app = Flask(__name__)

@app.route('/api/endpoints')
def Graphql_endpoints():
    # fuzzing for valid graphql endpoints
    # root domain
    root = request.args.get("root")

    parser = Endpoint_Finder()
    #endpoints = parser.enumerate_endpoints(root)
    endpoints = parser.enumerate_endpoints_for_all_subdomains(root)
    return endpoints