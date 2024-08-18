import requests

class Schema_parser:
    def __init__(self, cookies={}, headers={}) -> None:
        self.cookies = cookies
        self.headers = headers

    def query(self, url, query="") -> requests.Response:
        # graphql query
        res = requests.post(url, json={"query":query}, allow_redirects=False)
        return res

    def basic_introspection(self, url) -> str:
        with open("wordlists/schema_query.txt", "r") as f:
            return self.query(url, query=f.read()).content
        
    def clairvoyance_bypass(self, url) -> str:
        ...

    def regex_bypass(self, url) -> str:
        ...
