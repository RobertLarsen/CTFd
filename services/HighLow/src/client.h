#ifndef CLIENT_O8CJP6K
#define CLIENT_O8CJP6K

#include "protocol.h"
#include "game.h"
#include <sys/epoll.h>
#include <sqlite3.h>

#define MAX_CLIENTS 256
#define CLIENT_BUFFER_SIZE 1024

#define IS_ADMIN(c) ((c)->user.permissions & PERMISSION_ADMIN)
#define IS_AUTHENTICATED(c) ((c)->user.name[0])

typedef struct {
    char data[sizeof(Packet)];
    int bytes_in_buffer;
} Buffer;

#define BUFFER_INDEX(b) (&((b).data[(b).bytes_in_buffer]))
#define BUFFER_REMAINING(b) (CLIENT_BUFFER_SIZE - (b).bytes_in_buffer)

typedef struct Client_t {
    int id;
    int socket;
    int close_socket;
    User user;
    Game game;
    sqlite3 * db;
    struct Client_t * next;
    Buffer buffer;
} Client;

Client * client_pop(Client ** list);
Client * client_push(Client ** list, Client * client);

int become_admin(Client * client);

typedef int(*msg_handler)(Client*,Packet*);

Client * initialize_clients(Client * clients, int num, sqlite3 * db);
int count_clients(Client * c);
void client_init(Client * client, int socket);
int handle_client(struct epoll_event * evt, msg_handler * handlers);

int handle_dummy(Client * c, Packet * p);
int handle_auth(Client * c, Packet * p);
int handle_request_highscore(Client * c, Packet * p);
int handle_new_game(Client * c, Packet * p);
int handle_guess(Client * c, Packet * p);
int handle_list_users(Client * c, Packet * p);
int handle_detail_user(Client * c, Packet * p);

#endif /* end of include guard: CLIENT_O8CJP6K */
