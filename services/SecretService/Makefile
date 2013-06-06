LDFLAGS=-lpcap -lsqlite3 -ggdb -pthread -D_PARENT_SUPERVISION
CFLAGS=-ggdb

secretservice: src/*.c
	$(CC) -o $@ $(CFLAGS) $(LDFLAGS) $^

.PHONY: run
run: secretservice
	sudo ./secretservice test.db admin secret virbr0

SecretService.tar.gz:
	tar czf $@ --exclude-vcs -C .. SecretService/Makefile SecretService/secretservice-init SecretService/src/database.h SecretService/src/message.h SecretService/src/database.c SecretService/src/message.c SecretService/src/secretservice.c
