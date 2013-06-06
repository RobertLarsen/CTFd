#include "db.h"
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>


static void db_row_to_user(sqlite3_stmt * stmt, User * user) {
    user->id = sqlite3_column_int(stmt, 0);
    strncpy(user->name, (char*)sqlite3_column_text(stmt, 1), USERNAME_SIZE);
    strncpy(user->password, (char*)sqlite3_column_text(stmt, 2), PASSWORD_SIZE);
    user->permissions = sqlite3_column_int(stmt, 3);
    user->score = sqlite3_column_int(stmt, 4);
    user->num_games = sqlite3_column_int(stmt, 5);
}

sqlite3 * get_db(const char * file) {
    sqlite3 * database = NULL;
    struct stat st;
    int existing = 0;
    sqlite3_stmt * stmt;
    if (stat(file, &st) == 0 && S_ISREG(st.st_mode)) {
        existing = 1;
    }
    if (sqlite3_open(file, &database) == SQLITE_OK) {
        if (!existing) {
            char * sql = "create table users(id integer primary key autoincrement, name varchar(32) unique, password varchar(65), permissions integer default '0', score integer default '0', num_games integer default '0')";
            sqlite3_prepare(database, sql, strlen(sql), &stmt, NULL);
            sqlite3_step(stmt);
            sqlite3_finalize(stmt);

            sql = "insert into users(name, password, permissions) values('admin', hex(randomblob(32)), 1)";
            sqlite3_prepare(database, sql, strlen(sql), &stmt, NULL);
            sqlite3_step(stmt);
            sqlite3_finalize(stmt);
        }
    }

    return database;
}

static AuthResult db_create_user(sqlite3 * db, User * user) {
    AuthResult res = AUTH_BAD;
    sqlite3_stmt * stmt;
    char sql[256];
    int len;
    len = snprintf(sql, sizeof(sql), "insert into users(name, password) values('%s', '%s')", user->name, user->password);
    if (sqlite3_prepare(db, sql, len, &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_DONE) {
            res = AUTH_CREATED;
        }
        sqlite3_finalize(stmt);
    }

    return res;
}

AuthResult db_authenticate(sqlite3 * db, User * user) {
    AuthResult res = AUTH_BAD;
    sqlite3_stmt * stmt;
    char sql[256];
    int len;
    len = snprintf(sql, sizeof(sql), "select * from users where name='%s' AND password='%s'", user->name, user->password);
    if (sqlite3_prepare(db, sql, len, &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            /* User existed */
            db_row_to_user(stmt, user);
            res = AUTH_OK;
        }
        sqlite3_finalize(stmt);
    }
    return res;
}

AuthResult db_auth(sqlite3 * db, User * user) {
    return db_authenticate(db, user) == AUTH_OK ? AUTH_OK :
           db_create_user(db, user) == AUTH_BAD ? AUTH_BAD :
           db_authenticate(db, user) == AUTH_BAD ? AUTH_BAD :
           AUTH_CREATED;
}

void db_update_score(sqlite3 * db, User * user) {
    sqlite3_stmt * stmt;
    char sql[256];
    int len;
    len = snprintf(sql, sizeof(sql), "update users set score=%d where id=%d and score<%d", user->score, user->id, user->score);
    if (sqlite3_prepare(db, sql, len, &stmt, NULL) == SQLITE_OK) {
        sqlite3_step(stmt);
        sqlite3_finalize(stmt);
    }
}

void db_update_num_games(sqlite3 * db, User * user) {
    sqlite3_stmt * stmt;
    char sql[256];
    int len;
    len = snprintf(sql, sizeof(sql), "update users set num_games=%d where id=%d", user->num_games, user->id);
    if (sqlite3_prepare(db, sql, len, &stmt, NULL) == SQLITE_OK) {
        sqlite3_step(stmt);
        sqlite3_finalize(stmt);
    }
}

int db_retrieve_highscore(sqlite3 * db, User * destination, int max_entries) {
    sqlite3_stmt * stmt;
    char * sql = "select * from users order by score desc";
    int i = 0;
    if (sqlite3_prepare(db, sql, strlen(sql), &stmt, NULL) == SQLITE_OK) {
        while (max_entries-- > 0 && sqlite3_step(stmt) == SQLITE_ROW) {
            db_row_to_user(stmt, &destination[i++]);
        }
        sqlite3_finalize(stmt);
    }
    return i;
}

int db_list_users(sqlite3 * db, User * destination, int first, int max) {
    sqlite3_stmt * stmt;
    char sql[64];
    int len, i = 0;
    len = snprintf(sql, 64, "select * from users limit %d, %d", first, max);
    if (sqlite3_prepare(db, sql, len, &stmt, NULL) == SQLITE_OK) {
        while (max-- > 0 && sqlite3_step(stmt) == SQLITE_ROW) {
            db_row_to_user(stmt, &destination[i++]);
        }
        sqlite3_finalize(stmt);
    }
    return i;
}

int db_num_users(sqlite3 * db) {
    sqlite3_stmt * stmt;
    char * sql = "select count(*) as count from users";
    int num = 0;
    if (sqlite3_prepare(db, sql, strlen(sql), &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            num = sqlite3_column_int(stmt, 0);
        }
        sqlite3_finalize(stmt);
    }
    return num;
}

int db_detail_user(sqlite3 * db, User * user) {
    sqlite3_stmt * stmt;
    char sql[64];
    int len, found = 0;
    len = snprintf(sql, 64, "select * from users where name='%s'", user->name);
    if (sqlite3_prepare(db, sql, len, &stmt, NULL) == SQLITE_OK) {
        if ( sqlite3_step(stmt) == SQLITE_ROW) {
            db_row_to_user(stmt, user);
            found = 1;
        }
        sqlite3_finalize(stmt);
    }
    return found;
}
