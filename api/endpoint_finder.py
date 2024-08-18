import re
from threading import Thread
import requests

"""

Script for enumerating subdomains and for fuzzing for graphql endpoints

"""

class Subdomain_Finder:
    def __int__(self) -> None:
        pass

    def enumerate_subdomains(self, root) -> list:
        # enumerating subdomains
        res = requests.get(f"https://crt.sh/?q={root}")
        return list(set(re.findall("[\w\.]*"+root, res.text)))


class Endpoint_Finder:
    def __init__(self) -> None:
        pass

    def query(self, url, query="") -> requests.Response:
        # graphql query
        res = requests.post(url, json={"query":query}, allow_redirects=False, timeout=1)
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
        # finding graphql endpoints on the given domain
        # this might have to be changed to add directly into the dictionary so there are no conflicts (maybe)
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