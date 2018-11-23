import unittest
import re
from im_config import IMConfig
from island_manager import IslandManager
from island_setup import IslandSetup
from executor import ShellExecutor as Executor
from downloader import Downloader

class TestConfig(unittest.TestCase):
    def setUp(self):
        self.config = IMConfig("../default_config.json", "../config.json")
        self.setup = IslandSetup(self.config)
        self.island_manager = IslandManager(self.setup)

    def test_init(self):
        print("Test 1")
        self.config["vmid"] = "12345"
        self.config.save()

    def test_custom(self):
        print("Test 2")
        assert self.config["vmid"] == "12345"

    def test_im_init(self):
        pattern = re.compile(r"^(?=.*vboxmanage)(?=.*Island).+")
        im = IslandManager(self.config)
        a = im.get_command("launch")
        assert re.match(pattern, a)
        print(a)

    def test_stop_cmd(self):
        pattern = re.compile(r"^(?=.*vboxmanage)(?=.*Island).+")

        im = IslandManager(self.config)
        a = im.get_command("stop")
        assert re.match(pattern, a)
        print(a)

    def test_start(self):

        im = IslandManager(self.config)
        respone = im.launch_island()
        print(respone)

    def test_stop(self):

        im = IslandManager(self.config)
        respone = im.stop_island()
        print(respone)

    def test_is_vm_running(self):

        im = IslandManager(self.config)
        r = im.is_running()
        print(r)

    def test_is_vm_running(self):

        im = IslandManager(self.config)
        r = im.stop_island()
        print(r)
        assert(im.is_running() is False)
        im.launch_island()
        assert (im.is_running() is True)

    def test_vbox_download(self):
        self.setup.install_virtualbox()

    def test_setup_vbox_exists(self):
        assert(self.setup.is_vbox_set_up() is True)


    def test_setup_vm_exists(self):
        assert(self.setup.is_islands_vm_exist() )

    def test_grep(self):
        res = Executor.exec("vboxmanage list vms | "
                "grep -c \\\"{vmname}\\\"  ".format(vmname="Island"))
        print(not not res)

    def test_downloadvm(self):
        self.setup.download_vm()

    def test_hostonlysetup(self):
        self.setup.setup_host_only_adapter()

    def test_path_parse(self  ):
        from os import environ
        from island_setup import InvalidPathFormat
        res = self.setup.parse_shared_folder_path("~/islandsData")
        assert res == (environ["HOME"] + "/islandsData/islandsData")
        res = self.setup.parse_shared_folder_path("/Users/kostia/islandsData")
        assert res == ("/Users/kostia/islandsData/islandsData")
        res = self.setup.parse_shared_folder_path("~")
        assert res == (environ["HOME"] + "/islandsData")
        with self.assertRaises(InvalidPathFormat) as context:
             self.setup.parse_shared_folder_path("../blabla")

    def test_sharedfolder_creation(self):
        self.setup.setup_shared_folder("~/islandsData")


    def test_vmcontrol(self):
            # """vboxmanage guestcontrol Island run --exe "/bin/ls" --username root --password islands  --wait-stdout -- ls "/" """
            res = Executor.exec_sync(
                "ls ~/ "
            )
            print("STDOUT PRINT: %s\nRESULT: %d\nERROR: %s" %(res[1], res[0], res[2]))



    def test_ipfetch(self):
        import re
        res = Executor.exec('vboxmanage guestcontrol Island run --exe "/sbin/ip" --username root --password islands  --wait-stdout -- ip a  | grep eth1')
        v = re.search(r'(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)', res).group()
        print("OUTPUT IS %s" % v)

    def test_hash(self):
        print(self.setup.sha1("/Users/konstantin/Downloads/Island.ova"))


    def test_download(self):
        link = self.config['vbox_download']
        Downloader.get(link)
        #res = Executor.exec('curl {link}  -o ~/Downloads/test.dmg'.format(link=self.config['vbox_download']))
      #  print(res)

    def test_safe_exec(self):
        a = Executor.exec_sync('curl {link}  -o ~/Downloads/test.dmg'.format(link=self.config['vbox_download']))
        print(str(a))

