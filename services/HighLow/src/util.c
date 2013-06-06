#include <stdio.h>
#include <ctype.h>
#include "util.h"
#include "client.h"

void dump_hex(void * ptr, int num) {
    unsigned char * addr = (unsigned char *)ptr;
#define PTR_IDX(i,j) ((i)*16+(j))
    long i, j;
    for (i = 0; i < (num + 15) / 16; i++) {
        printf("%08lx: ", (unsigned long)addr + (i * 16));
        for (j = 0; j < 16; j++) {
            if (j == 8) {
                printf(" ");
            }
            if (PTR_IDX(i,j) < num) {
                printf("%02x ", addr[PTR_IDX(i,j)]);
            } else {
                printf("   ");
            }
        }
        printf("  ");
        for (j = 0; j < 16 && PTR_IDX(i,j) < num; j++) {
            if (j == 8) {
                printf(" ");
            }
            printf("%c", isprint(addr[PTR_IDX(i,j)]) ? addr[PTR_IDX(i,j)] : '.');
        }

        printf("\n");
    }
#undef PTR_IDX
}
