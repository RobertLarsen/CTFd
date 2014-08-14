CFLAGS=-ggdb -Wall -fno-stack-protector
LDFLAGS=-lm -lsqlite3

whereami: src/*.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

points: points.c
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

.phony: run clean

run: whereami
	./whereami

clean:
	rm -f whereami points

test: src/*.c
	$(CC) -DTEST $(CFLAGS) -o $@ $^ $(LDFLAGS)
