import lib.vendor.libtorrent as lt
import time
import sys

def run_test():
    PORT_RANGE = (6881, 6891)  # This is standard but who said that you have to be? :-)
    ses = lt.session()
    ses.listen_on(PORT_RANGE[0], PORT_RANGE[1])
    ses.add_dht_router("router.utorrent.com", 6881)
    ses.add_dht_router("router.bittorrent.com", 6881)
    ses.add_dht_router("dht.transmissionbt.com", 6881)
    ses.add_dht_router("router.bitcomet.com", 6881)
    ses.add_dht_router("dht.aelitis.com", 6881)
    ses.add_dht_router('127.0.0.1', 6881)

    ses.start_dht()
  #  time.sleep(10)

    print("DHT started")


    fs = lt.file_storage()
    lt.add_files(fs, "1")
    t = lt.create_torrent(fs)
    print("Torrent created")
    lt.set_piece_hashes(t, ".")
    t.add_node('127.0.0.1', 6881)
    torrent = t.generate()

    # tf = "Nuance.torrent"
    # f = open(tf, "wb")
    # f.write(lt.bencode(torrent))
    # f.close()


    magnet = lt.make_magnet_uri(lt.torrent_info(torrent))

    infoM = lt.parse_magnet_uri(magnet)
  #  infoF = lt.torrent_info(tf)

    # info["seed_mode"] = True
    print(magnet)
    #h = ses.add_torrent(info)
    # h = ses.add_torrent({
    #     'ti': lt.torrent_info(torrent), 'save_path': '.'
    # })
    atp = lt.add_torrent_params()
    atp.ti = lt.torrent_info(torrent)
    atp.save_path = "."

    h = ses.add_torrent(atp)
    print("Torrent added")
    while True:
        s = h.status()

        print('\r%.2f%% complete (down: %.1f kB/s up: %.1f kB/s peers: %d) %s' % (
            s.progress * 100, s.download_rate / 1000, s.upload_rate / 1000,
            s.num_peers, s.state), end=' ')

        alerts = ses.pop_alerts()
        for a in alerts:
            if a.category() & lt.alert.category_t.error_notification:
                print(a)

        sys.stdout.flush()

        time.sleep(1)
        if s.progress == 1:
            break

    ses.remove_torrent(h, False)
    while True:
        print("Sleeping")
        time.sleep(1)

if __name__ == '__main__':
    run_test()
