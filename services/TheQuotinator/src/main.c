#include <stdio.h>
#include <errno.h>
#include <stdlib.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>
#include <malloc.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#if defined(_DEBUG)
    #define DEBUG_OUT(fmt, args...) fprintf(stderr, fmt, ##args);
#else
    #define DEBUG_OUT(fmt, args...)
#endif

#define USERNAME_MAX 64
#define QUOTE_SIZE 1024
typedef struct quote {
    struct quote * next;
    char text[QUOTE_SIZE];
} quote;

#define AUTHOR_NAME_MAX 64
typedef struct author {
    struct author * next;
    char name[AUTHOR_NAME_MAX];
    quote * quotes;
} author;

#define CLIENT_RECV_BUFFER 4095 /* We add one for a NULL terminator later */
typedef struct client {
    struct client * next;
    int socket;
    int should_disconnect;
    int buffer_content;
    char buffer[CLIENT_RECV_BUFFER + 1];/* We want a NULL terminator */
    char username[USERNAME_MAX];/* This is just stored for checking but will be used for other things in future versions */
    char password[USERNAME_MAX];/* This is just stored for checking but will be used for other things in future versions */

    void (*quit_command)(struct client*);
    void (*quotes_command)(struct client*);
    void (*quote_command)(struct client*);
    void (*addquote_command)(struct client*);
    void (*admin_command)(struct client*);
    void (*authors_command)(struct client*);
} client;

#define MAX_CLIENTS 256
client client_buffer[MAX_CLIENTS];

char admin_name[USERNAME_MAX];
char admin_pass[USERNAME_MAX];
short server_port;
int server_socket;
int socket_flags;
int selected;
int i;
struct sockaddr_in server_addr;
fd_set readset;
fd_set reads;
client * free_clients = NULL;
client * active_clients = NULL;
client * current_client = NULL;
client * prev_client = NULL;
author * authors = NULL;

static int count_quotes(quote * head) {
    int count = 0;
    while (head) {
        count++;
        head = head->next;
    }
    return count;
}

static quote * append_quote(author * author, char * q, int len) {
    quote * quot = (quote*)malloc(sizeof(quote));
    memset(quot, 0, sizeof(quote));
    memcpy(quot->text, q, len);

    if (author->quotes == NULL) {
        author->quotes = quot;
    } else {
        quote * last = author->quotes;
        while (last->next) last = last->next;
        last->next = quot;
    }
    return quot;
}

static author * find_author(author * head, char * name, int namelen) {
    author * result = NULL;
    while (head && !result) {
        if (strncmp(head->name, name, namelen) == 0) {
            /* Found him */
            result = head;
        }
        head = head->next;
    }
    if (!result) {
        /* He was not found. Create new author structure */
        result = (author*)malloc(sizeof(author));
        memset(result, 0, sizeof(author));
        memcpy(result->name, name, namelen);
        result->next = authors;
        authors = result;
    }

    return result;
}

static int count_authors(author * head) {
    int count = 0;
    while (head) {
        count++;
        head = head->next;
    }
    return count;
}

#if defined(_DEBUG)
static int count_clients(client * head) {
    int count = 0;
    while (head) {
        count++;
        head = head->next;
    }
    return count;
}
#endif

static void standard_quit_command(client * c) {
    c->should_disconnect = 1;
}

static void standard_quotes_command(client * c) {
    char * authorname;
    char * authorend;
    char buffer[128];
    authorname = strstr(c->buffer, " \"");
    if (authorname) {
        authorname += 2;
        authorend = strstr(authorname, "\"\r\n");
        if (authorend) {
            author * a = find_author(authors, authorname, authorend - authorname);
            if (a) {
                sprintf(buffer, "%d\r\n", count_quotes(a->quotes));
            } else {
                strcpy(buffer, "No such author: ");
                strncat(buffer, authorname, authorend - authorname);
                strcat(buffer, "\r\n");
            }
            send(c->socket, buffer, strlen(buffer), 0);
        }
    }
    c->buffer_content = 0;
}

static void standard_quote_command(client * c) {
    char * authorname;
    char * nrstr;
    char * nrstrend;
    int nr, counter;
    author * au;
    quote * qu;
    authorname = strstr(c->buffer, " \"");
    if (authorname) {
        DEBUG_OUT("Found author name\n");
        authorname += 2;
        nrstr = strstr(authorname, "\" ");
        if (nrstr) {
            DEBUG_OUT("Found nr string\n");
            nrstr += 2;
            nrstrend = strstr(nrstr, "\r\n");
            if (nrstrend) {
                DEBUG_OUT("Found nr string end\n");
                sscanf(nrstr, "%d\r\n", &nr);
                counter = nr;
                au = find_author(authors, authorname, nrstr - 2 - authorname);
                qu = au->quotes;
                while (--counter > 0 && qu) qu = qu->next;
                if (qu) {
                    send(c->socket, qu->text, strlen(qu->text), 0);
                    send(c->socket, "\r\n", 2, 0);
                } else {
                    DEBUG_OUT("Found no such quote.\n");
                    char buffer[128];
                    counter = sprintf(buffer, "%s does not have %d quotes\r\n", au->name, nr);
                    send(c->socket, buffer, counter, 0);
                }
            }
        }
    }
    c->buffer_content = 0;
}

static void standard_addquote_command(client * c) {
    char * authorname;
    char * quotesize;
    char * quotebegin;

    authorname = strstr(c->buffer, " \"");
    if (authorname) {
        DEBUG_OUT("Got author name\n");
        authorname += 2;
        quotesize = strstr(authorname, "\" ");
        if (quotesize) {
            DEBUG_OUT("Got quote size\n");
            quotesize += 2;
            quotebegin = strstr(quotesize, "\r\n");
            if (quotebegin) {
                DEBUG_OUT("Got end of quote size\n");
                quotebegin += 2;
                int size;
                sscanf(quotesize, "%d\r\n", &size);
                DEBUG_OUT("Quote size is %d\n", size);
                if (c->buffer_content >= (size + (quotebegin - c->buffer))) {
                    DEBUG_OUT("We got entire quote\n");
                    author * author;
                    DEBUG_OUT("Finding author\n");
                    author = find_author(authors, authorname, quotesize - 2 - authorname);
                    DEBUG_OUT("Found author\n");
                    append_quote(author, quotebegin, size);
                    send(c->socket, "Quote received\r\n", 16, 0);
                    c->buffer_content = 0;
                }
            }
        }
    }
}

static void standard_authors_command(client * c) {
    send(c->socket, "You need to be admin for this\r\n", 31, 0);
    c->buffer_content = 0;
}

static void admin_authors_command(client * c) {
    char writebuffer[AUTHOR_NAME_MAX+3];
    int size;
    author * current;
    DEBUG_OUT("Executing admin authors command\n");
    size = sprintf(writebuffer, "%d\r\n", count_authors(authors));
    send(c->socket, writebuffer, size, 0);
    current = authors;
    while (current) {
        size = sprintf(writebuffer, "%s\r\n", current->name);
        send(c->socket, writebuffer, size, 0);
        current = current->next;
    }
    c->buffer_content = 0;
}

static void standard_admin_command(client * c) {
    char * name;
    char * pass;
    char * pass_end;

    name = strstr(c->buffer, " \"");
    if (name) {
        DEBUG_OUT("Found username\n");
        name += 2;/* Skip past doublequote */
        pass = strstr(c->buffer, "\" \"");
        if (pass) {
            DEBUG_OUT("Found password\n");
            pass += 3; /* Skip past doublequotes */
            pass_end = strchr(pass, '"');
            if (pass_end) {
                DEBUG_OUT("Found password end\n");
                /* Username and password seem to be wellformed */
                memcpy(c->username, name, pass - name - 3);
                c->username[pass - name - 3] = 0;

                memcpy(c->password, pass, pass_end - pass);
                c->password[pass_end - pass] = 0;
                if (strcmp(c->username, admin_name) == 0 &&
                    strcmp(c->password, admin_pass) == 0) {
                    DEBUG_OUT("Successful authentication\n");
                    /* Grant this user the privileges suitable for an admin */
                    c->authors_command = admin_authors_command;
                    send(c->socket, "ok\r\n", 4, 0);
                    goto admin_end;
                }
            }
        }
    }
    send(c->socket, "failed\r\n", 8, 0);

admin_end:
    c->buffer_content = 0;
}

static void parse_client(client * c) {
    if (strchr(c->buffer, ' ') || strstr(c->buffer, "\r\n")) {
        /* We have command */
        if (strncmp("QUOTES ", c->buffer, 7) == 0) {
            DEBUG_OUT("QUOTES command.\n");
            c->quotes_command(c);
        } else if (strncmp("QUOTE ", c->buffer, 6) == 0) {
            DEBUG_OUT("QUOTE command.\n");
            c->quote_command(c);
        } else if (strncmp("ADDQUOTE ", c->buffer, 9) == 0) {
            DEBUG_OUT("ADDQUOTE command.\n");
            c->addquote_command(c);
        } else if (strncmp("AUTHORS", c->buffer, 7) == 0) {
            DEBUG_OUT("AUTHORS command.\n");
            c->authors_command(c);
        } else if (strncmp("ADMIN ", c->buffer, 6) == 0) {
            DEBUG_OUT("ADMIN command.\n");
            c->admin_command(c);
        } else if (strncmp("QUIT", c->buffer, 4) == 0) {
            DEBUG_OUT("QUIT command.\n");
            c->quit_command(c);
        } else {
            DEBUG_OUT("Unknown command.\n");
            c->buffer_content = 0;
        }
    }
}

static void handle_server() {
    if (FD_ISSET(server_socket, &reads)) {
        int client_socket;
        while ((client_socket = accept(server_socket, NULL, NULL)) != -1) {
            DEBUG_OUT("Accepted client\n");
            /* If we have no more room for clients ... */
            if (free_clients == NULL) {
                DEBUG_OUT("No more free structs\n");
                close(client_socket);
            } else {
                /* Move struct from free list to active list */
                current_client = free_clients;
                free_clients = current_client->next;
                current_client->next = active_clients;
                active_clients = current_client;

                /* Make non blocking */
                socket_flags = fcntl(client_socket, F_GETFL, 0);
                fcntl(client_socket, F_SETFL, socket_flags | O_NONBLOCK);
                /* Add to readset */
                FD_SET(client_socket, &readset);

                /* Initialize client structure */
                current_client->socket            = client_socket;
                current_client->buffer_content    = 0;
                current_client->should_disconnect = 0;
                current_client->quit_command      = standard_quit_command;
                current_client->quotes_command    = standard_quotes_command;
                current_client->quote_command     = standard_quote_command;
                current_client->addquote_command  = standard_addquote_command;
                current_client->admin_command     = standard_admin_command;
                current_client->authors_command   = standard_authors_command;
                strcpy(current_client->username, "default");
            }
        }
    }
}

static void handle_clients() {
    prev_client = NULL;
    current_client = active_clients;
    while (current_client) {
        DEBUG_OUT("Handling client: %d\n", current_client->socket);
        /* Read to the client */
        int bytes_read;
        while (current_client->buffer_content < CLIENT_RECV_BUFFER && (bytes_read = read(current_client->socket, &current_client->buffer[current_client->buffer_content], CLIENT_RECV_BUFFER - current_client->buffer_content)) > 0) {
            DEBUG_OUT("Read %d bytes from %d\n", bytes_read, current_client->socket);
            current_client->buffer_content += bytes_read;
        }
        DEBUG_OUT("bytes_read is %d\n", bytes_read);
        /* Either buffer is full, or we have read all that the client has sent, or the client has disconnected */
        if (bytes_read == 0) {
            DEBUG_OUT("Client disconnected\n");
            /* Client has disconnected */
            current_client->should_disconnect = 1;
        } else {
            current_client->buffer[current_client->buffer_content] = 0;
            parse_client(current_client);
            /* If buffer is full at this point in time then we cannot handle the next message from the client */
            if (current_client->buffer_content == CLIENT_RECV_BUFFER) {
                DEBUG_OUT("Buffer is full.\n");
                current_client->should_disconnect = 1;
            }
        }

        if (current_client->should_disconnect) {
            close(current_client->socket);
            FD_CLR(current_client->socket, &readset);
            if (prev_client != NULL) {
                DEBUG_OUT("Setting prev_client->next\n");
                prev_client->next = current_client->next;
            }
            if (active_clients == current_client) {
                DEBUG_OUT("Setting active_clients\n");
                active_clients = current_client->next;
            }
            client * tmp = current_client->next;
            current_client->next = free_clients;
            free_clients = current_client;
            current_client = tmp;
        } else {
            prev_client = current_client;
            current_client = current_client->next;
        }
    }
}

int run_server(int argc, char ** argv) {
    DEBUG_OUT("---DEBUG MODE---\n");

    if (argc < 4) {
        printf("Usage: %s <port> <adminname> <adminpass>\n", argv[0]);
        return 0;
    }

    server_port = atoi(argv[1]);
    DEBUG_OUT("Port: %d\n", server_port);
    strcpy(admin_name, argv[2]);
    strcpy(admin_pass, argv[3]);

    /* Create server socket */
    server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket == -1) {
        perror("socket");
        exit(-1);
    }
    DEBUG_OUT("Got server socket\n");

    /* Reuse address */
    socket_flags = 1;
    if (setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &socket_flags, sizeof(socket_flags)) < 0) {
        perror("setsockopt");
        exit(-1);
    }

    /* Make socket non blocking */
    socket_flags = fcntl(server_socket, F_GETFL, 0);
    if (fcntl(server_socket, F_SETFL, socket_flags | O_NONBLOCK) != 0) {
        perror("fcntl");
        exit(-1);
    }
    DEBUG_OUT("Server socket is non blocking\n");

    /* Bind to our port */
    memset(&server_addr, 0, sizeof(struct sockaddr_in));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(server_port);
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
    if (bind(server_socket, (struct sockaddr*)&server_addr, sizeof(server_addr)) == -1) {
        perror("bind");
        exit(-1);
    }
    DEBUG_OUT("Server socket is bound\n");

    /* Allocate queue for 10 sockets */
    listen(server_socket, 10);
    DEBUG_OUT("Server socket has room for 10 incoming connections\n");

    /* Add to readset */
    FD_ZERO(&readset);
    FD_SET(server_socket, &readset);

    /* Initialize client buffer */
    memset(client_buffer, 0, sizeof(client_buffer));
    for (i = 0; i < MAX_CLIENTS - 1; i++) {
        client_buffer[i].next = &client_buffer[i + 1];
    }
    free_clients = &client_buffer[0];

    /* Run IO loop */
    while (1) {
        reads = readset;
        DEBUG_OUT("Waiting forever for IO. ");
        DEBUG_OUT("Active client count: %d", count_clients(active_clients));
        DEBUG_OUT("  Free client count: %d\n", count_clients(free_clients));
        selected = select(FD_SETSIZE, &reads, NULL, NULL, NULL);
        if (selected < 0) {
            perror("select");
            exit(-1);
        }
        DEBUG_OUT("select() returned %d\n", selected);
        if (selected > 0) {
            handle_clients();
            handle_server();
        }
    }
    return 0;
}

int main (int argc, char ** argv) {
#if defined(_PARENT_SUPERVISION)
    pid_t pid, status, err;
#if defined(_DAEMONIZE)
    daemon(1, 0);
#endif
    do {
        pid = fork();
        if (pid) {
            /* Parent */
            DEBUG_OUT("Waiting for child\n");
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
