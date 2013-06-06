#include <arpa/inet.h>
#include <ctype.h>
#include <linux/icmp.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/udp.h>
#include <net/if.h>
#include <pcap/pcap.h>
#include <pthread.h>
#include <sqlite3.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include "sqlite3.h"
#include "message.h"
#include "database.h"

#if !defined(PCAP_NETMASK_UNKNOWN)
#define PCAP_NETMASK_UNKNOWN -1
#endif

#define PCAP_FILTER_OPTIMIZE 1
#define PCAP_PROMISC 0
#define PCAP_MILLISECONDS 0
#define PCAP_SNAPLEN 1024
#define PCAP_FILTER_FORMAT "icmp[icmptype] = 3 and icmp[icmpcode] = 3 and src host %s"

#define MIN(x, y) ((x) < (y) ? (x) : (y))

typedef struct {
    char name[256];
    char pass[256];
    struct sockaddr_in server;
    sqlite3 * db;
    int stop;
    int socket;
    int is_admin;
} user_t;

typedef enum {
    ACTION_UNKNOWN = -1,
    ACTION_GET = 0,
    ACTION_PUT = 1,
    ACTION_DELETE = 2,
    ACTION_IS_ADMIN = 3,
    ACTION_NUM = 4,
    ACTION_ITERATE = 5,
    ACTION_QUIT
} action_t;

typedef struct {
    action_t action;
    char key[128];
    char value[128];
} request_t;

#define ACTION_STR(a) ((a) == ACTION_UNKNOWN ? "ACTION_UNKNOWN" : (a) == ACTION_GET ? "ACTION_GET" : (a) == ACTION_PUT ? "ACTION_PUT" : "Undefined")
#define INITIALIZE_REQUEST(r) request_t r; bzero(&r, sizeof(request_t)); r.action = ACTION_UNKNOWN

int equals(char * start, char * end, char * value);
void copy(char * start, char * end, char * destination);

static char admin_name[256];
static char admin_pass[256];
static pcap_t * pcap;
static sqlite3 * db;

void send_to_user(const char * str, user_t * user) {
    if (user->stop == 0) {
        int written, to_write  = strlen(str);
        if ((written = write(user->socket, str, to_write)) != to_write) {
            user->stop = 1;
        }
    }
}

void error_to_user(const char * str, user_t * user) {
    send_to_user("<msg error=\"", user);
    send_to_user(str, user);
    send_to_user("\"/>\n", user);
}

int request_message_handler(MsgKeyValue * key_value, void * ptr) {
    request_t * req = (request_t*)ptr;

    if (equals(key_value->key_start, key_value->key_end, "action")) {
        if (equals(key_value->value_start, key_value->value_end, "get")) {
            req->action = ACTION_GET;
        } else if (equals(key_value->value_start, key_value->value_end, "put")) {
            req->action = ACTION_PUT;
        } else if (equals(key_value->value_start, key_value->value_end, "delete")) {
            req->action = ACTION_DELETE;
        } else if (equals(key_value->value_start, key_value->value_end, "admin")) {
            req->action = ACTION_IS_ADMIN;
        } else if (equals(key_value->value_start, key_value->value_end, "num")) {
            req->action = ACTION_NUM;
        } else if (equals(key_value->value_start, key_value->value_end, "iterate")) {
            req->action = ACTION_ITERATE;
        } else if (equals(key_value->value_start, key_value->value_end, "quit")) {
            req->action = ACTION_QUIT;
        } else {
            req->action = ACTION_UNKNOWN;
        }
    } else if (equals(key_value->key_start, key_value->key_end, "key")) {
        copy(key_value->value_start, key_value->value_end, req->key);
    } else if (equals(key_value->key_start, key_value->key_end, "value")) {
        copy(key_value->value_start, key_value->value_end, req->value);
    }

    return 0;
}

void get_handler(const unsigned char * value, void * ptr) {
    user_t * user = (user_t*)ptr;
    send_to_user("<msg value=\"", user);
    send_to_user(value, user);
    send_to_user("\"/>\n", user);
}

void iterate_handler(const unsigned char * key, const unsigned char * value, void * ptr) {
    user_t * user = (user_t*)ptr;
    send_to_user("<msg key=\"", user);
    send_to_user(key, user);
    send_to_user("\" value=\"", user);
    send_to_user(value, user);
    send_to_user("\"/>\n", user);
}

void handle_user_data(user_t * user, char * buffer, int bytes_read) {
    INITIALIZE_REQUEST(req);

    if (msg_end_index(buffer) < 0) {
        user->stop = 1;
    } else {
        message_parser(buffer, request_message_handler, &req);
        switch (req.action) {
            case ACTION_GET:
                if (!database_get(user->db, req.key, get_handler, user)) {
                    error_to_user("No such key", user);
                }
                break;
            case ACTION_PUT:
                if (req.key[0] && req.value[0]) {
                    database_put(user->db, req.key, req.value);
                    send_to_user("<msg key=\"", user);
                    send_to_user(req.key, user);
                    send_to_user("\" value=\"", user);
                    send_to_user(req.value, user);
                    send_to_user("\"/>\n", user);
                } else {
                    error_to_user("Either key or value is empty", user);
                }
                break;
            case ACTION_DELETE:
                break;
            case ACTION_IS_ADMIN:
                send_to_user("<msg admin=\"", user);
                send_to_user(user->is_admin == 1 ? "yes" : "no", user);
                send_to_user("\"/>\n", user);
                break;
            case ACTION_ITERATE:
                if (user->is_admin == 1) {
                    database_iterate(user->db, iterate_handler, user);
                    send_to_user("<msg/>\n", user);
                } else {
                    error_to_user("Iteration requires admin rights", user);
                }
                break;
            case ACTION_NUM:
                if (user->is_admin = 1) {
                    char buffer[128];
                    snprintf(buffer, sizeof(buffer), "<msg rows=\"%d\"/>\n", database_rows(user->db));
                    send_to_user(buffer, user);
                } else {
                    error_to_user("Sizing requires admin rights", user);
                }
                break;
            case ACTION_QUIT:
                user->stop = 1;
                break;
            case ACTION_UNKNOWN:
            default:
                error_to_user("I do not know what you want done", user);
                break;
        }
    }
}

void * client_thread(void * ptr) {
    user_t * user = (user_t*)ptr;
    char buffer[256];
    int bytes_read;

    user->socket = socket(AF_INET, SOCK_STREAM, 0);

    if (user->socket != -1) {
        if (connect(user->socket, (struct sockaddr*)&user->server, sizeof(struct sockaddr_in)) == 0) {
            user->stop = 0;

            while (!user->stop) {
                bytes_read = read(user->socket, buffer, sizeof(buffer) - 1);
                if (bytes_read > 0) {
                    buffer[bytes_read] = '\0';
                    handle_user_data(user, buffer, bytes_read);
                } else {
                    user->stop = 1;
                }
            }

            close(user->socket);
        }
    }

    free(user);

    return NULL;
}

int get_device_address(const char * device, struct sockaddr_in * addr) {
    struct ifreq reqs[10];
    struct ifconf conf;
    conf.ifc_len = sizeof(reqs);
    conf.ifc_req = reqs;
    int num, i, sock = socket(AF_INET,SOCK_DGRAM,0);

    if (sock == 0) {
      return -1;
    }

    if (ioctl(sock, SIOCGIFCONF, &conf) < 0) {
      close(sock);
      return -1;
    }

    close(sock);

    num = conf.ifc_len / sizeof(struct ifreq);

    for (i = 0; i < num; i++) {
        if (strcmp(reqs[i].ifr_name, device) == 0) {
            memcpy(addr, &reqs[ i ].ifr_addr, sizeof(struct sockaddr_in));
            return 0;
        }
    }
    return -1;
}

pcap_t * configure_pcap(const char * device, const char * filter) {
    pcap_t * pcap;
    char error[PCAP_ERRBUF_SIZE];
    struct bpf_program prog;

    
    error[0] = '\0';
    if ((pcap = pcap_open_live(device, PCAP_SNAPLEN, PCAP_PROMISC, PCAP_MILLISECONDS, error)) == NULL) {
        /* Error */
        return NULL;
    }

    if (pcap_compile(pcap, &prog, filter, PCAP_FILTER_OPTIMIZE, PCAP_NETMASK_UNKNOWN) < 0) {
        pcap_close(pcap);
        return NULL;
    }

    if (pcap_setfilter(pcap, &prog) < 0) {
        pcap_close(pcap);
        return NULL;
    }

    return pcap;
}

int equals(char * start, char * end, char * value) {
    int i = 0;
    while (start + i != end && start[i] == value[i]) {
        i++;
    }
    return start + i == end;
}

void copy(char * start, char * end, char * destination) {
    int i = 0;
    while (start + i != end) {
        destination[i] = start[i];
        i++;
    }
}

int key_value(MsgKeyValue * kv, void * ptr) {
    user_t * user = (user_t*)ptr;
    char data[16];

    if (equals(kv->key_start, kv->key_end, "port")) {
        copy(kv->value_start, kv->value_end, data);
        user->server.sin_port = htons(atoi(data));
    } else if (equals(kv->key_start, kv->key_end, "user")) {
        copy(kv->value_start, kv->value_end, user->name);
    } else if (equals(kv->key_start, kv->key_end, "pass")) {
        copy(kv->value_start, kv->value_end, user->pass);
    }
    return 0;
}

void callback(struct sockaddr_in * sender, char * data, int len) {
    user_t * user;
    pthread_t thread;
    char msg[256];
    int idx = MIN(len, sizeof(msg));

    memcpy(msg, data, idx);
    msg[idx] = '\0';

    if ((idx = msg_end_index(msg)) > 0) {
        msg[idx] = '\0';
        user = (user_t*)malloc(sizeof(user_t));
        bzero(user, sizeof(user_t));

        user->db = db;
        user->server.sin_addr.s_addr = sender->sin_addr.s_addr;
        user->server.sin_family = AF_INET;
        message_parser(msg, key_value, user);

        if (strcmp(user->name, admin_name) == 0 && strcmp(user->pass, admin_pass) == 0) {
            user->is_admin = 1;
        }

        if (pthread_create(&thread, NULL, client_thread, user) != 0) {
            free(user);
        }
    }
}

int sniff(pcap_t * pcap, void(*callback)(struct sockaddr_in*, char *, int)) {
    const u_char * data;
    struct pcap_pkthdr hdr;
    struct ethhdr * eth;
    struct iphdr * ip;
    struct icmphdr * icmp;
    struct udphdr * udp;

    struct sockaddr_in user_address;

    while ((data = pcap_next(pcap, &hdr))) {
        eth = (struct ethhdr*)data;
        if (eth->h_proto == htons(ETH_P_IP)) {
            /* Got IPv4 packet */
            ip = (struct iphdr*)&data[sizeof(struct ethhdr)];
            if (ip->version == 4 && ip->protocol == IPPROTO_ICMP) {
                /* This is a IPv4 packet containing ICMP */
                icmp = (struct icmphdr*)&data[sizeof(struct ethhdr) + (ip->ihl * 32 / 8)];
                if (icmp->type == ICMP_DEST_UNREACH	&& icmp->code == ICMP_PORT_UNREACH) {
                    /* This is a correct ICMP packet. It should contain another IP packet. */
                    ip = (struct iphdr*) &((char*)icmp)[sizeof(struct icmphdr)];
                    if (ip->protocol == IPPROTO_UDP) {
                        udp = (struct udphdr*) &((char*)ip)[ip->ihl * 32 / 8];

                        user_address.sin_port = udp->source;
                        user_address.sin_addr.s_addr = ip->saddr;

                        callback(&user_address, &((char*)udp)[sizeof(struct udphdr)], ntohs(udp->len) - sizeof(struct udphdr));
                    }
                }
            }
        }
    }

    pcap_close(pcap);
    return 0;
}

int run_server(int argc, const char **argv) {
    char filter[256];
    struct sockaddr_in addr;
    const char * device;
    
    db = get_configured_database(argc > 1 ? argv[1] : "test.db");

    if (db) {
        strcpy(admin_name, argc > 2 ? argv[2] : "admin");
        strcpy(admin_pass, argc > 3 ? argv[3] : "password");
        device = argc > 4 ? argv[4] : "eth0";

        if (get_device_address(device, &addr) == 0) {
            snprintf(filter, sizeof(filter), PCAP_FILTER_FORMAT, inet_ntoa((struct in_addr)addr.sin_addr));
            if ((pcap = configure_pcap(device, filter))) {
                return sniff(pcap, callback);
            } else {
                sqlite3_close(db);
                return -1;
            }
        } else {
            fprintf(stderr, "No such device: %s\n", device);
            sqlite3_close(db);
            return -1;
        }
    } else {
        fprintf(stderr, "Could not open database.\n");
        return -1;
    }
    return 0;
}

int main (int argc, const char ** argv) {
#if defined(_PARENT_SUPERVISION)
    pid_t pid, status, err;
#if defined(_DAEMONIZE)
    daemon(1, 0);
#endif
    do {
        pid = fork();
        if (pid) {
            /* Parent */
            err = waitpid(pid, &status, 0);
        } else {
            /* Child */
            run_server(argc, argv);
            exit(0);
        }
    } while (1);
    return 0;
#else
    return run_server(argc, argv);
#endif
}
