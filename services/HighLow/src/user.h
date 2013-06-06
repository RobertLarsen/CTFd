#ifndef USER_H027LTEK
#define USER_H027LTEK

#define USERNAME_SIZE 64
#define PASSWORD_SIZE 64

#define PERMISSION_NONE 0
#define PERMISSION_ADMIN 1 << 0

typedef struct {
    int id;
    char name[USERNAME_SIZE + 1];
    char password[USERNAME_SIZE + 1];
    int permissions;
    int score;
    int num_games;
} __attribute__((packed)) User;

#endif /* end of include guard: USER_H027LTEK */
