CFLAGS=-ggdb -Wall -D_DAEMONIZE -D_PARENT_SUPERVISION
LDFLAGS=-ggdb -lsqlite3

.PHONY: run all clean

hlserver: src/*.c
	$(CC) $(LDFLAGS) $(CFLAGS) -o $@ $^

HighLow.tar.gz:
	tar czf $@ --exclude-vcs -C .. HighLow/Makefile HighLow/highlow-init HighLow/src

all: hlserver hlclient

clean:
	rm -f hlserver hlclient

hlclient: client/main.c
	$(CC) -ggdb -Wall -Isrc -o $@ $<

run: hlserver
	./$<
