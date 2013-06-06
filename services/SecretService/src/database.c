#include "database.h"
#include <stdlib.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>
#include <stdio.h>

sqlite3 * get_configured_database(const char * file) {
    sqlite3 * database = NULL;
    struct stat st;
    int existing = 0;
    if (stat(file, &st) == 0 && S_ISREG(st.st_mode)) {
        existing = 1;
    }
    if (sqlite3_open(file, &database) == SQLITE_OK) {
        if (!existing) {
            /* Build database */
            sqlite3_stmt * create_stmt;
            char sql[] = "create table key_value(key varchar(128) primary key, value varchar(128))";
            sqlite3_prepare(database, sql, sizeof(sql), &create_stmt, NULL);
            sqlite3_step(create_stmt);
            sqlite3_finalize(create_stmt);
        }
    }

    return database;
}

void database_put(sqlite3 * db, const char * key, const char * value) {
    char sql[1024];
    int len;
    sqlite3_stmt * insert_stmt;
    len = snprintf(sql, sizeof(sql) - 1, "replace into key_value values('%s', '%s')", key, value);
    sqlite3_prepare(db, sql, len, &insert_stmt, NULL);
    sqlite3_step(insert_stmt);
    sqlite3_finalize(insert_stmt);
}

int database_get(sqlite3 * db, const char * key, void(*fnc)(const unsigned char*, void*), void * userdata) {
    char sql[1024];
    const unsigned char * val;
    int len, ret = 0;
    sqlite3_stmt * get_stmt = NULL;
    len = snprintf(sql, sizeof(sql) - 1, "select value from key_value where key='%s'", key);
    if (sqlite3_prepare(db, sql, len, &get_stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(get_stmt) == SQLITE_ROW && (val = sqlite3_column_text(get_stmt, 0))) {
            fnc(val, userdata);
            ret = 1;
        }
        sqlite3_finalize(get_stmt);
    }
    return ret;
}

void database_delete(sqlite3 * db, const char * key) {
    char sql[1024];
    int len;
    sqlite3_stmt * delete_stmt;
    len = snprintf(sql, sizeof(sql) - 1, "delete from key_value where key='%s'", key);
    sqlite3_prepare(db, sql, len, &delete_stmt, NULL);
    sqlite3_step(delete_stmt);
    sqlite3_finalize(delete_stmt);
}

int database_iterate(sqlite3 * db, void(*fnc)(const unsigned char *, const unsigned char*, void*), void * userdata) {
    char sql[] = "select key, value from key_value";
    int ret = 0;
    sqlite3_stmt * iterate_stmt;
    sqlite3_prepare(db, sql, sizeof(sql), &iterate_stmt, NULL);
    while (sqlite3_step(iterate_stmt) == SQLITE_ROW) {
        fnc(sqlite3_column_text(iterate_stmt, 0), sqlite3_column_text(iterate_stmt, 1), userdata);
        ret++;
    }
    sqlite3_finalize(iterate_stmt);
    return ret;
}

int database_rows(sqlite3 * db) {
    char sql[] = "select count(*) from key_value";
    int ret = 0;
    sqlite3_stmt * count_stmt;
    sqlite3_prepare(db, sql, sizeof(sql), &count_stmt, NULL);
    if (sqlite3_step(count_stmt) == SQLITE_ROW) {
        ret = sqlite3_column_int(count_stmt, 0);
    }
    sqlite3_finalize(count_stmt);
    return ret;
}

