#include "protocol.h"
#include "client.h"
#include "util.h"
#include "db.h"
#include <stdlib.h>
#include <stdio.h>
#include <errno.h>
#include <unistd.h>
#include <string.h>

void send_packet(Client * c, Packet * p, int type, int size) {
    p->header.type = type;
    p->header.size = size;
    write(c->socket, p, PACKET_SIZE(p));
}

int handle_dummy(Client * c, Packet * p) {
    c->close_socket = 1;
    return 0;
}

int handle_auth(Client * c, Packet * p) {
    AuthResult res;
    Packet return_packet;
    strncpy(c->user.name, p->data.auth.name, USERNAME_SIZE);
    strncpy(c->user.password, p->data.auth.password, PASSWORD_SIZE);
    res = db_auth(c->db, &c->user);
    if (res == AUTH_BAD) {
        c->user.name[0] = '\0';
        c->close_socket = 1;
        send_packet(c, &return_packet, MSG_TYPE_AUTH_FAILURE, 0);
    } else {
        return_packet.data.auth_success.user_id = c->user.id;
        return_packet.data.auth_success.user_permissions = c->user.permissions;
        return_packet.data.auth_success.user_score = c->user.score;
        return_packet.data.auth_success.user_num_games= c->user.num_games;
        return_packet.data.auth_success.created = (res == AUTH_CREATED);
        send_packet(c, &return_packet, MSG_TYPE_AUTH_SUCCESS, sizeof(AuthSuccess));
    }
    return 0;
}

int handle_request_highscore(Client * c, Packet * p) {
    Packet return_packet;
    User highscore_users[MAX_HIGHSCORE_ENTRIES];
    int entries, i;

    entries = db_retrieve_highscore(c->db, highscore_users, MAX_HIGHSCORE_ENTRIES);
    for (i = 0; i < entries; i++) {
        strncpy(return_packet.data.highscore.entries[i].name, highscore_users[i].name, USERNAME_SIZE);
        return_packet.data.highscore.entries[i].score = highscore_users[i].score;
    }

    send_packet(c, &return_packet, MSG_TYPE_HIGHSCORE, entries * sizeof(HighscoreEntry));

    return 0;
}

#define NEXT_NUMBER (rand() % (HIGHEST_NUMBER - LOWEST_NUMBER + 1) + LOWEST_NUMBER)

int handle_new_game(Client * c, Packet * p) {
    Packet return_packet;
    if (c->game.in_progress == 0) {
        c->user.num_games++;
        c->game.in_progress = 1;
        c->game.round = 1;
        c->game.number = NEXT_NUMBER;
        db_update_num_games(c->db, &c->user);

        return_packet.data.round.round = c->game.round;
        return_packet.data.round.number = c->game.number;
        return_packet.data.round.low = LOWEST_NUMBER;
        return_packet.data.round.high = HIGHEST_NUMBER;

        send_packet(c, &return_packet, MSG_TYPE_ROUND, sizeof(Round));
    }

    return 0;
}

int handle_guess(Client * c, Packet * p) {
    int next;
    Packet return_packet;
    if (c->game.in_progress) {
        while ((next = NEXT_NUMBER) == c->game.number);
        if ((p->data.guess.answer == HIGHER && next > c->game.number) ||
            (p->data.guess.answer == LOWER  && next < c->game.number)) {
            /* Correct */
            c->game.round++;
            c->game.number = next;
            c->user.score = c->game.round;
            db_update_score(c->db, &c->user);

            return_packet.data.round.round = c->game.round;
            return_packet.data.round.number = c->game.number;
            return_packet.data.round.low = LOWEST_NUMBER;
            return_packet.data.round.high = HIGHEST_NUMBER;

            send_packet(c, &return_packet, MSG_TYPE_ROUND, sizeof(Round));
        } else {
            /* Incorrect */
            c->game.in_progress = 0;
            return_packet.data.game_over.round = c->game.round;
            return_packet.data.game_over.number = next;
            send_packet(c, &return_packet, MSG_TYPE_GAME_OVER, sizeof(GameOver));
        }
    }
    return 0;
}

#define MIN(x,y) ((x) < (y) ? (x) : (y))

int handle_list_users(Client * c, Packet * p) {
    Packet return_packet;
    User users[MAX_USERS];
    int i, num;
    if (IS_ADMIN(c)) {
        num = db_list_users(c->db, users, p->data.list_users.first, MIN(p->data.list_users.number, MAX_USERS));
        return_packet.data.user_list.num = num;
        return_packet.data.user_list.total = db_num_users(c->db);
        for (i = 0; i < num; i++) {
            strcpy(return_packet.data.user_list.names[i], users[i].name);
        }
        send_packet(c, &return_packet, MSG_TYPE_USER_LIST, sizeof(int) + (num * (USERNAME_SIZE + 1)));
    }
    return 0;
}

int handle_detail_user(Client * c, Packet * p) {
    char username[USERNAME_SIZE + 1];
    strncpy(username, p->data.detail_user.name, USERNAME_SIZE);
    strncpy(p->data.user_details.user.name, username, USERNAME_SIZE);
    if (db_detail_user(c->db, &p->data.user_details.user)) {
        send_packet(c, p, MSG_TYPE_USER_DETAILS, sizeof(UserDetails));
    } else {
        send_packet(c, p, MSG_TYPE_USER_NOT_FOUND, 0);
    }
    return 0;
}

void client_init(Client * client, int socket) {
    client->socket = socket;
    client->close_socket = 0;
    client->user.permissions = PERMISSION_NONE;
    client->user.name[0] = '\0';
    client->next = NULL;
    client->buffer.bytes_in_buffer = 0;
    client->game.in_progress = 0;
}

Client * initialize_clients(Client * clients, int num, sqlite3 * db) {
    int i;
    Client * next = NULL;
    for (i = 0; i < num; i++) {
        clients[i].id = i;
        clients[i].db = db;
        clients[i].next = next;
        next = &clients[i];
    }
    return next;
}

int count_clients(Client * c) {
    return c ? 1 + count_clients(c->next) : 0;
}

int become_admin(Client * client) {
    client->user.permissions |= PERMISSION_ADMIN;
    return 0;
}

Client * client_pop(Client ** list) {
    Client * res = *list;
    if (res) {
        *list = res->next;
    }
    return res;
}

Client * client_push(Client ** list, Client * client) {
    client->next = *list;
    *list = client;
    return client;
}

int handle_client_data(Client * client, msg_handler * handlers) {
    int handled = 0;
    if (client->buffer.bytes_in_buffer >= sizeof(Header)) {
        Packet * p = (Packet*)client->buffer.data;
        if (client->buffer.bytes_in_buffer >= PACKET_SIZE(p)) {
            handled = PACKET_SIZE(p);

            if (p->header.type < MSG_TYPE_LAST) {
                if (p->header.type != MSG_TYPE_AUTH && !IS_AUTHENTICATED(client)) {
                    Packet return_packet;
                    send_packet(client, &return_packet, MSG_TYPE_NEED_AUTH, 0);
                } else {
                    handlers[p->header.type](client, p);
                }
            }
        }
    }
    return handled;
}

int handle_client(struct epoll_event * evt, msg_handler * handlers) {
    Client * client;
    ssize_t bytes_read = 1;
    int bytes_handled;
    client = (Client*)evt->data.ptr;

    if (evt->events & (EPOLLERR|EPOLLHUP|EPOLLRDHUP)) {
        return 0;
    } else if (evt->events & EPOLLIN) {
        while (BUFFER_REMAINING(client->buffer) && (bytes_read = read(client->socket, BUFFER_INDEX(client->buffer), BUFFER_REMAINING(client->buffer))) > 0) {
            client->buffer.bytes_in_buffer += bytes_read;
        }

        if (bytes_read == 0 || (bytes_read < 0 && errno != EAGAIN)) {
            return 0;
        }

        while ((bytes_handled = handle_client_data(client, handlers)) > 0) {
            client->buffer.bytes_in_buffer -= bytes_handled;
            memcpy(client->buffer.data, &client->buffer.data[bytes_handled], client->buffer.bytes_in_buffer);
        }
    }

    return client->close_socket == 0;
}
