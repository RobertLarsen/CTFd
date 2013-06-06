#ifndef PROTOCOL_DD1SDZ9L
#define PROTOCOL_DD1SDZ9L

#include "user.h"

typedef struct {
    char name[USERNAME_SIZE + 1];
    char password[PASSWORD_SIZE + 1];
} __attribute__((packed)) Auth;

#define REASON_BAD_CREDENTIALS 0
typedef struct {
    int reason;
} __attribute__((packed)) AuthFailure;

typedef struct {
    int user_id;
    int user_permissions;
    int user_score;
    int user_num_games;
    int created;
} __attribute__((packed)) AuthSuccess;

#define MAX_HIGHSCORE_ENTRIES 10
typedef struct {
    char name[USERNAME_SIZE + 1];
    int score;
} __attribute__((packed)) HighscoreEntry;

typedef struct {
    HighscoreEntry entries[MAX_HIGHSCORE_ENTRIES];
} __attribute__((packed)) Highscore;

#define HIGHEST_NUMBER 100
#define LOWEST_NUMBER 1

typedef struct {
    int round;
    int low;
    int high;
    int number;
} __attribute__((packed)) Round;

typedef struct {
    int round;
    int number;
} __attribute__((packed)) GameOver;

typedef enum {
    HIGHER,
    LOWER
} HighLow;

typedef struct {
    HighLow answer;
} __attribute__((packed)) Guess;

typedef struct {
    int first;
    int number;
} __attribute__((packed)) ListUsers;

#define MAX_USERS 10
typedef struct {
    int total;
    int num;
    char names[MAX_USERS][USERNAME_SIZE + 1];
} __attribute__((packed)) UserList;

typedef struct {
    char name[USERNAME_SIZE + 1];
} __attribute__((packed)) DetailUser;

typedef struct {
    User user;
} __attribute__((packed)) UserDetails;


enum {
    MSG_TYPE_AUTH,
    MSG_TYPE_AUTH_FAILURE,
    MSG_TYPE_AUTH_SUCCESS,
    MSG_TYPE_NEED_AUTH,
    MSG_TYPE_REQUEST_HIGHSCORE,
    MSG_TYPE_HIGHSCORE,
    MSG_TYPE_NEW_GAME,
    MSG_TYPE_GAME_OVER,
    MSG_TYPE_ROUND,
    MSG_TYPE_GUESS,

    MSG_TYPE_LIST_USERS,
    MSG_TYPE_USER_LIST,
    MSG_TYPE_DETAIL_USER,
    MSG_TYPE_USER_DETAILS,
    MSG_TYPE_USER_NOT_FOUND,

    MSG_TYPE_LAST,
    MSG_TYPE_BAD
};

typedef struct {
    int type;
    int size;
} __attribute__((packed)) Header;

typedef struct {
    Header header;
    union {
        Auth auth;
        AuthFailure auth_failure;
        AuthSuccess auth_success;
        Highscore highscore;
        Round round;
        GameOver game_over;
        Guess guess;
        ListUsers list_users;
        UserList user_list;
        DetailUser detail_user;
        UserDetails user_details;
    } data;
} __attribute__((packed)) Packet;
#define PACKET_SIZE(p) (sizeof(Header) + (p)->header.size)
#define PACKET_FULL(p,s) (((s) >= sizeof(Header)) && ((s) >= sizeof(Header) + (p)->header.size))

#endif /* end of include guard: PROTOCOL_DD1SDZ9L */
