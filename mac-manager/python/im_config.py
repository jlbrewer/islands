import os
import json


class IMConfig:
    def __init__(self):
        self.__default = self.__get_dafault()
        self.__custom = self.__load()


    def __load(self):
        if os.path.exists("config.json"):
            with open("config.json") as f:
                return json.load(f)
        else:
            return dict()


    def save(self):
        with open("config.json", "w") as f:
            json.dump(self.__custom, f)


    def __getitem__(self, item):
        result =  self.__custom.get(item) or self.__default.get(item)
        if result is not None:
            return result
        raise KeyError

    def __setitem__(self, key, value):
        if key in self.__default:
            self.__custom[key] = value
        else:
            raise KeyError


    def __get_dafault(self):
        return {
            "vboxmanage": "/usr/local/bin/vboxmanage",
            "vmname": "",
            "vmid": "",
            "hostonly": {
                "vboxnetip": "192.168.56.1",
                "netmask": "255.255.255.0",
                "lowerip": "192.168.56.100",
                "upperip": "192.168.56.200"
            },

            "natpf": {
                "name": "Island_pf",
                "protocol": "tcp",
                "host_ip": "127.0.0.1",
                "host_port": "4000",
                "guest_ip": "0.0.0.0",
                "guest_port": "4000"
            }
        }
