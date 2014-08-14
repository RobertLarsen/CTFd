#include <math.h>
#include <time.h>
#include <sqlite3.h>
#include <ctype.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <signal.h>
#include <unistd.h>
#include <string.h>
#include "rlmalloc.h"

#define DATABASE "whereami.sqlite3"
#define NAME_MAX 16
#define MAX_PRIZES 128
#define BUFFER_SIZE 1024
#define BUFFER_ROOM(b) (BUFFER_SIZE - (b)->count)
#define GRID_ROWS 10000
#define GRID_COLS 10000
#define MAX_GUESSES 10

typedef struct {
    int user_id;
    char name[NAME_MAX];
    int num;
} highscore_entry_t;

typedef enum {
    NONE,
    CREATE,
    LOGIN,
    PLAY,
    GUESS,
    HIGHSCORE,
    PRIZE,
    WON,
    UNKNOWN
} command_t;

typedef enum {
    NEW,
    LOGGED_IN,
    PLAYING,
    WIN,
    DISCONNECTED
} state_t;

typedef struct {
    int begin;
    int end;
} range_t;

typedef struct {
    char buffer[BUFFER_SIZE];
    size_t count;
} buffer_t;

typedef struct {
    char prizes[MAX_PRIZES];
    int num_prizes;
    int user_id;
    int socket;
    struct sockaddr_in addr;
    state_t state;
    int x;
    int y;
    int guesses;
} client_t;

typedef int (*handler_t)(client_t * client, command_t cmd, int argc, char ** args);

static int create_user_in_db(char * name, char * pass);
static int user_login_in_db(char * name, char * pass);
static int get_user_prizes_from_db(int user_id, char * prizes, int max);
static void add_user_prize(int user_id, int prize);
static int get_highscore(highscore_entry_t * highscore, int max);


static int create_server(unsigned short port) {
    int server;
    int flags;
    struct sockaddr_in addr;

    server = socket(AF_INET, SOCK_STREAM, 0);
    if (server < 0) {
        return -1;
    }

    flags = 1;
    if (setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &flags, sizeof(flags)) < 0) {
        close(server);
        return -1;
    }

    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(server, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(server);
        return -1;
    }

    if (listen(server, 10) < 0) {
        close(server);
        return -1;
    }

    return server;
}

static int buffer_read(int socket, buffer_t * buffer) {
    size_t bytes_read;

    bytes_read = read(socket, buffer->buffer + buffer->count, BUFFER_ROOM(buffer) - 1);
    if (bytes_read > 0) {
        buffer->count += bytes_read;
        buffer->buffer[buffer->count] = 0;
    }

    return bytes_read;
}

static int buffer_contains_newline(buffer_t * buffer) {
    int i;
    for (i = 0; i < buffer->count; i++) {
        if (buffer->buffer[i] == '\n') {
            return 1;
        }
    }
    return 0;
}

static void empty_buffer(buffer_t * buffer) {
    memset(buffer, 0, sizeof(buffer_t));
}

static int starts_with(buffer_t * buffer, char * str) {
    return strstr(buffer->buffer, str) == buffer->buffer;
}

static command_t what_command(buffer_t * buffer) {
    command_t cmd = UNKNOWN;

    if (buffer->count == 0) {
        cmd = NONE;
    } else if (starts_with(buffer, "CREATE ")) {
        cmd = CREATE;
    } else if (starts_with(buffer, "LOGIN ")) {
        cmd = LOGIN;
    } else if (starts_with(buffer, "PLAY")) {
        cmd = PLAY;
    } else if (starts_with(buffer, "GUESS ")) {
        cmd = GUESS;
    } else if (starts_with(buffer, "HIGHSCORE")) {
        cmd = HIGHSCORE;
    } else if (starts_with(buffer, "PRIZE ")) {
        cmd = PRIZE;
    } else if (starts_with(buffer, "WON")) {
        cmd = WON;
    }

    return cmd;
}

static command_t read_from_client(client_t * client, buffer_t * buffer) {
    while (client->state != DISCONNECTED && buffer_contains_newline(buffer) == 0) {
        empty_buffer(buffer);
        if (buffer_read(client->socket, buffer) == 0) {
            client->state = DISCONNECTED;
        }
    }
    return what_command(buffer);
}

static int next_range(buffer_t * buffer, range_t * range) {
    while (range->begin < buffer->count && isspace(buffer->buffer[range->begin])) {
        range->begin++;
    }
    range->end = range->begin + 1;

    if (buffer->buffer[range->begin] == '"') {
        /* Search for matching quote */
        while (range->end < buffer->count && buffer->buffer[range->end] != '"') {
            range->end++;
        }
        if (buffer->buffer[range->end] != '"') {
            /* End of line found before matching quote */
            range->begin = buffer->count;
        }
    } else {
        /* Search for whitespace or end of line */
        while (range->end < buffer->count && isspace(buffer->buffer[range->end]) == 0) {
            range->end++;
        }
    }

    return range->begin < buffer->count;
}

static char ** split(buffer_t * buffer) {
    char ** argv;
    range_t range = { 0, 0 };
    int count = 0;

    while (next_range(buffer, &range)) {
        count++;
        range.begin = range.end + 1;
    }

    argv = rlmalloc((count + 1) * sizeof(char*));
    count = range.begin = 0;

    while (next_range(buffer, &range)) {
        if (buffer->buffer[range.begin] == '"') {
            argv[count] = &buffer->buffer[range.begin + 1];
            buffer->buffer[range.end] = 0;
        } else {
            argv[count] = &buffer->buffer[range.begin];
            buffer->buffer[range.end] = 0;
        }
        count++;
        range.begin = range.end + 1;
    }
    
    argv[count] = NULL;

    return argv;
}

static int handle_create(client_t * client, int argc, char ** args) {
    int res = 0;
    if (argc >= 3) {
        res = 1;
        if (create_user_in_db(args[1], args[2])) {
            dprintf(client->socket, "User successfully created. Now log in.\n");
        } else {
            dprintf(client->socket, "Could not create user.\n");
        }
    }
    return res;
}

static int handle_login(client_t * client, int argc, char ** args) {
    int res = 0;
    if (argc >= 3) {
        res = 1;
        client->user_id = user_login_in_db(args[1], args[2]);
        if (client->user_id) {
            client->state = LOGGED_IN;
            client->num_prizes = get_user_prizes_from_db(client->user_id, client->prizes, MAX_PRIZES);
            dprintf(client->socket, "Login successful.\n");
        } else {
            dprintf(client->socket, "Login failed.\n");
        }
    }
    return res;
}

static int handle_play(client_t * client, int argc, char ** args) {
    int res = 0;

    if (argc == 1) {
        res = 1;
        client->x = rand() % GRID_COLS;
        client->y = rand() % GRID_ROWS;
        client->guesses = MAX_GUESSES;
        client->state = PLAYING;
        dprintf(client->socket, "Aaight...I am in a %d by %d grid. Guess my location! You have %d tries left.\n", GRID_COLS, GRID_COLS, MAX_GUESSES);
    }

    return res;
}

static int handle_won(client_t * client, int argc, char ** args) {
    int num, i;
    char b[64];

    num = get_user_prizes_from_db(client->user_id, b, -1);
    for (i = 0; i < num; i++) {
        if (i > 0) {
            dprintf(client->socket, ",");
        }
        dprintf(client->socket, "%d", b[i] & 0xff);
    }
    dprintf(client->socket, "\n");

    client->guesses = 0;
    return 1;
}

static int handle_highscore(client_t * client, int argc, char ** args) {
    int res = 0, i, count;
    highscore_entry_t highscore[10];

    if (argc == 1) {
        res = 1;
        memset(highscore, 0, sizeof(highscore));
        count = get_highscore(highscore, 10);
        dprintf(client->socket, "========Highscore========\n");
        for (i = 0; i < count; i++) {
            dprintf(client->socket, "%2d : %15s - %2d\n", (i + 1), highscore[i].name, highscore[i].num);
        }
        dprintf(client->socket, "end\n");
    }

    return res;
}

static int handler_NEW(client_t * client, command_t cmd, int argc, char ** args) {
    int was_handled;
    switch (cmd) {
        case CREATE:
            was_handled = handle_create(client, argc, args);
        break;
        case LOGIN:
            was_handled = handle_login(client, argc, args);
        break;
        default:
            was_handled = 0;
        break;
    }
    return was_handled;
}

static int handler_LOGGED_IN(client_t * client, command_t cmd, int argc, char ** args) {
    int was_handled;
    switch (cmd) {
        case PLAY:
            was_handled = handle_play(client, argc, args);
        break;
        case HIGHSCORE:
            was_handled = handle_highscore(client, argc, args);
        break;
        case WON:
            was_handled = handle_won(client, argc, args);
        break;
        default:
            was_handled = 0;
        break;
    }
    return was_handled;
}

double distance(double x1, double y1, double x2, double y2) {
    double dx = x1 - x2,
           dy = y1 - y2;
    return sqrt(dx*dx + dy*dy);
}

static int handle_prize(client_t * client, int argc, char ** args) {
    int res = 0, prize;

    if (argc == 2) {
        res = 1;
        sscanf(args[1], "%d", &prize);
        add_user_prize(client->user_id, prize & 0xff);
        if (client->num_prizes < MAX_PRIZES) {
            client->prizes[client->num_prizes++] = prize & 0xff;
        }
        dprintf(client->socket, "You took prize %d. You now have %d prizes.\n", prize & 0xff, client->num_prizes);
        client->state = LOGGED_IN;
    }

    return res;
}

static int handler_WIN(client_t * client, command_t cmd, int argc, char ** args) {
    int was_handled;
    switch (cmd) {
        case PRIZE:
            was_handled = handle_prize(client, argc, args);
        break;
        default:
            was_handled = 0;
        break;
    }
    return was_handled;
}

static int handler_PLAYING(client_t * client, command_t cmd, int argc, char ** args) {
    int res = 0, x, y;

    if (cmd == GUESS && argc == 2) {
        res = 1;
        sscanf(args[1], "%d,%d", &x, &y);
        client->guesses--;
        if (client->x == x && client->y == y) {
            /* Yay */
            dprintf(client->socket, "That was spot on! Congrats, you win a prize [0-255]:\n");
            client->state = WIN;
        } else if (client->guesses == 0) {
            client->state = LOGGED_IN;
            dprintf(client->socket, "Sorry, you have no more guesses. I were at %d,%d.\n", client->x, client->y);
        } else {
            dprintf(client->socket, "Sorry, you were %.03lf units off. You have %d tries left.\n", distance(x, y, client->x, client->y), client->guesses);
        }
    }

    return res;
}

static int handler_DISCONNECTED(client_t * client, command_t cmd, int argc, char ** args) {
    close(client->socket);
    return 1;
}

static const handler_t state_handlers[] = {
    handler_NEW,
    handler_LOGGED_IN,
    handler_PLAYING,
    handler_WIN,
    handler_DISCONNECTED
};

static int handle_client_state(client_t * client, command_t cmd, int argc, char ** args) {
    return state_handlers[client->state](client, cmd, argc, args);
}

static int count_args(char ** a) {
    int c = 0;
    while (a[c]) {
        c++;
    }
    return c;
}

static void handle_client(client_t * client) {
    buffer_t buffer;
    command_t cmd;
    char ** argv;
    dprintf(client->socket, "Welcome to \"Where Am I\"\nA game of luck or mathematical skills.\nCreate account or log in.\n\n");
    empty_buffer(&buffer);
    while (client->state != DISCONNECTED) {
        cmd = read_from_client(client, &buffer);
        if (cmd == UNKNOWN) {
            dprintf(client->socket, "Unknown command.\n");
        } else {
            argv = split(&buffer);
            if (handle_client_state(client, cmd, count_args(argv), argv) == 0) {
                dprintf(client->socket, "Bad command or arguments.\n");
            }
            rlfree(argv);
        }
        empty_buffer(&buffer);
    }
}

static void client_exited(int sig) {
    int status;
    wait(&status);
}

static void get_username(int id, char * name) {
    sqlite3 * db;
    sqlite3_stmt * stmt;
    int res, err;
    if (sqlite3_open(DATABASE, &db) == SQLITE_OK) {
        do {
            err = sqlite3_prepare_v2(db, "SELECT name FROM users WHERE id = ?", -1, &stmt, NULL);
        } while (err == SQLITE_BUSY);

        if (err == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, id);
            while (1) {
                res = sqlite3_step(stmt);
                if (res == SQLITE_ERROR) {
                    break;
                } else if (res == SQLITE_ROW) {
                    strncpy(name, (char*)sqlite3_column_text(stmt, 0), NAME_MAX - 1);
                    break;
                }
            }

            sqlite3_finalize(stmt);
        }
        sqlite3_close(db);
    }
}

static int get_highscore(highscore_entry_t * highscore, int max) {
    sqlite3 * db;
    sqlite3_stmt * stmt;
    int count = 0, res, i = 0, err;
    if (sqlite3_open(DATABASE, &db) == SQLITE_OK) {
        do {
            err = sqlite3_prepare_v2(db, "select user_id, count(*) as count from prizes group by user_id order by count desc limit ?", -1, &stmt, NULL);
        } while (err == SQLITE_BUSY);

        if (err == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, max);

            while (1) {
                res = sqlite3_step(stmt);
                if (res == SQLITE_ERROR || res == SQLITE_DONE) {
                    break;
                } else if (res == SQLITE_ROW) {
                    highscore[count].user_id = sqlite3_column_int(stmt, 0);
                    highscore[count].num = sqlite3_column_int(stmt, 1);
                    count++;
                }
            }

            sqlite3_finalize(stmt);
        }
        sqlite3_close(db);
    }

    for (i = 0; i < count; i++) {
        get_username(highscore[i].user_id, highscore[i].name);
    }
    return count;
}

static void add_user_prize(int user_id, int prize) {
    sqlite3 * db;
    sqlite3_stmt * stmt;
    int res, err;
    if (sqlite3_open(DATABASE, &db) == SQLITE_OK) {
        do {
            err = sqlite3_prepare_v2(db, "INSERT INTO prizes(user_id, prize) VALUES(?, ?)", -1, &stmt, NULL);
        } while (err == SQLITE_BUSY);

        if (err == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, user_id);
            sqlite3_bind_int(stmt, 2, prize);

            while (1) {
                res = sqlite3_step(stmt);
                if (res == SQLITE_DONE || res == SQLITE_ERROR) {
                    break;
                }
            }

            sqlite3_finalize(stmt);
        }
        sqlite3_close(db);
    }
}

static int get_user_prizes_from_db(int user_id, char * prizes, int max) {
    sqlite3 * db;
    sqlite3_stmt * stmt;
    int count = 0, res, err;
    if (sqlite3_open(DATABASE, &db) == SQLITE_OK) {
        do {
            err = sqlite3_prepare_v2(db, "SELECT prize FROM prizes WHERE user_id=? ORDER BY id LIMIT ?", -1, &stmt, NULL);
        } while (err == SQLITE_BUSY);

        if (err == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, user_id);
            sqlite3_bind_int(stmt, 2, max > 0 ? max : 10000);

            while (1) {
                res = sqlite3_step(stmt);
                if (res == SQLITE_ERROR || res == SQLITE_DONE) {
                    break;
                } else if (res == SQLITE_ROW) {
                    prizes[count++] = sqlite3_column_int(stmt, 0);
                }
            }

            sqlite3_finalize(stmt);
        }
        sqlite3_close(db);
    }
    return count;
}

static int user_login_in_db(char * name, char * pass) {
    sqlite3 * db;
    sqlite3_stmt * stmt;
    int id = 0, res, err;
    if (sqlite3_open(DATABASE, &db) == SQLITE_OK) {
        do {
            err = sqlite3_prepare_v2(db, "SELECT id FROM users WHERE name=? AND password=?", -1, &stmt, NULL);
        } while (err == SQLITE_BUSY);

        if (err == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, name, -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 2, pass, -1, SQLITE_STATIC);

            while (1) {
                res = sqlite3_step(stmt);
                if (res == SQLITE_ROW) {
                    id = sqlite3_column_int(stmt, 0);
                    break;
                } else if (res == SQLITE_ERROR || res == SQLITE_DONE) {
                    break;
                }
            }
            sqlite3_finalize(stmt);
        }
        sqlite3_close(db);
    }
    return id;
}

static int create_user_in_db(char * name, char * pass) {
    sqlite3 * db;
    sqlite3_stmt * stmt;
    int res = 0, err;
    if (sqlite3_open(DATABASE, &db) == SQLITE_OK) {
        do {
            err = sqlite3_prepare_v2(db, "INSERT INTO users(name, password) VALUES(?, ?)", -1, &stmt, NULL);
        } while (err == SQLITE_BUSY);

        if (err == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, name, -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 2, pass, -1, SQLITE_STATIC);

            while (1) {
                res = sqlite3_step(stmt);
                if (res == SQLITE_DONE) {
                    res = 1;
                    break;
                } else if (res == SQLITE_ERROR || res == SQLITE_CONSTRAINT) {
                    res = 0;
                    break;
                }
            }

            sqlite3_finalize(stmt);
        }
        sqlite3_close(db);
    }
    return res;
}

static void initialize_database(sqlite3 * db) {
#define DB_EXEC(sql) sqlite3_exec(db, sql, NULL, NULL, NULL)
    DB_EXEC("create table users(id integer primary key autoincrement, name varchar(16) not null, password varchar(64) not null, unique(name))");
    DB_EXEC("create table prizes(id integer primary key autoincrement, user_id integer, prize integer)");
#undef DB_EXEC
}

int create_database() {
    int res = 1;
    struct stat st;
    sqlite3 * db;
    if (stat(DATABASE, &st) < 0) {
        if (sqlite3_open(DATABASE, &db) == SQLITE_OK) {
            initialize_database(db);
            sqlite3_close(db);
        } else {
            res = 0;
        }
    }
    return res;
}

#if defined(TEST)
int main(int argc, char const *argv[]) {
    buffer_t buffer;
    char ** a, ** b;
    memset(&buffer, 0, sizeof(buffer_t));
    strcpy(buffer.buffer, argv[1]);
    buffer.count = strlen(argv[1]);

    a = split(&buffer);
    for (b = a; *b; b++) {
        printf("'%s'\n", *b);
    }
    rlfree(a);

    return 0;
}
#else
int main(int argc, char const *argv[]) {
    int server;
    socklen_t addrlen;
    client_t * client;
    pid_t pid;


    signal(SIGCHLD, client_exited);

    create_database();
    server = create_server(argc > 1 ? atoi(argv[1]) : 8181);
    while (1) {

        client = rlmalloc(sizeof(client_t));
        memset(client, 0, sizeof(client_t));
        client->state = NEW;

        addrlen = sizeof(struct sockaddr_in);
        client->socket = accept(server, (struct sockaddr*)&client->addr, &addrlen);

        pid = fork();
        if (pid) {
            /* Parent */
            close(client->socket);
            rlfree(client);
        } else {
            /* Child */
            srand(time(NULL) ^ getpid());
            close(server);
            handle_client(client);
            close(client->socket);
            rlfree(client);
            exit(0);
        }
    }

    return 0;
}
#endif
