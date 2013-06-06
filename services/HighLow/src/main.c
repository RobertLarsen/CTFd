#include "db.h"
#include "server.h"
#include "client.h"
#include "protocol.h"
#include "util.h"
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>
#include <fcntl.h>
#include <time.h>
#include <sys/wait.h>
#include <sys/epoll.h>
#include <sys/types.h>          /* See NOTES */
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

static Client clients[MAX_CLIENTS];
static Client * available;
static msg_handler handlers[] = {
    /* MSG_TYPE_AUTH */ handle_auth,
    /* MSG_TYPE_AUTH_FAILURE */ handle_dummy,
    /* MSG_TYPE_AUTH_SUCCESS */ handle_dummy,
    /* MSG_TYPE_NEED_AUTH */ handle_dummy,
    /* MSG_TYPE_REQUEST_HIGHSCORE */ handle_request_highscore,
    /* MSG_TYPE_HIGHSCORE */ handle_dummy,
    /* MSG_TYPE_NEW_GAME */ handle_new_game,
    /* MSG_TYPE_GAME_OVER */ handle_dummy,
    /* MSG_TYPE_ROUND */ handle_dummy,
    /* MSG_TYPE_GUESS */ handle_guess,
    /* MSG_TYPE_LIST_USERS */ handle_list_users,
    /* MSG_TYPE_USER_LIST */ handle_dummy,
    /* MSG_TYPE_DETAIL_USER */ handle_detail_user,
    /* MSG_TYPE_USER_DETAILS */ handle_dummy,
    /* MSG_TYPE_USER_NOT_FOUND */ handle_dummy
};

int create_epoll(int server) {
    int epfd;
    struct epoll_event evt;

    if ((epfd = epoll_create(MAX_CLIENTS)) < 0) {
        return -1;
    }

    evt.events = EPOLLIN;
    evt.data.fd = server;
    if (epoll_ctl(epfd, EPOLL_CTL_ADD, server, &evt) < 0) {
        close(epfd);
        return -1;
    }

    return epfd;
}

void io_loop(int epfd, int server) {
    int num, i;
    struct epoll_event evts[10];
    Client * client;

    while (1) {
        num = epoll_wait(epfd, evts, 10, -1);
        if (num < 0) {
            return;
        } else {
            for (i = 0; i < num; i++) {
                if (evts[i].data.fd == server) {
                    if (handle_server(epfd, &evts[i], &available) == 0) {
                        return;
                    }
                } else {
                    if (handle_client(&evts[i], handlers) == 0) {
                        client = (Client*)evts[i].data.ptr;
                        epoll_ctl(epfd, EPOLL_CTL_DEL, client->socket, NULL);
                        close(client->socket);
                        client_push(&available, client);
                    }
                }
            }
        }
    }
}

void run_server(const int port, const char * dbpath) {
    int server;
    int epfd;
    sqlite3 * db;

    db = get_db(dbpath);
    srand(time(NULL));

    available = initialize_clients(clients, MAX_CLIENTS, db);

    if ((server = create_server(port)) < 0) {
        fprintf(stderr, "Could not create server.\n");
        exit(-1);
    }

    if ((epfd = create_epoll(server)) < 0) {
        fprintf(stderr, "Could not create epoll fd.\n");
        exit(-1);
    }

    io_loop(epfd, server);

    close(epfd);
    close(server);
}

int main(int argc, const char *argv[]) {
#if defined(_PARENT_SUPERVISION)
    pid_t pid, status, err;
#if defined(_DAEMONIZE)
    daemon(1, 0);
#endif
    do {
        pid = fork();
        if (pid) {
            err = waitpid(pid, &status, 0);
        } else {
            run_server(argc > 1 ? atoi(argv[1]) : 7777,
                       argc > 2 ? argv[2] : "/tmp/HighLow.sqlite3");
            exit(0);
        }
    } while (1);
#else
    run_server(argc > 1 ? atoi(argv[1]) : 7777,
               argc > 2 ? argv[2] : "/tmp/HighLow.sqlite3");
#endif
    return 0;
}
