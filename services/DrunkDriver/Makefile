obj-m += drunkdriver.o
all:
	make -C /lib/modules/$(shell uname -r)/build M=$(shell pwd) modules
clean:
	make -C /lib/modules/$(shell uname -r)/build M=$(shell pwd) clean

cscope.out: cscope.files
	cscope -b -q -k

cscope.files:
	find /usr/src/linux-headers-$(shell uname -r) -name '*.h' > $@

insert: all
	sudo insmod drunkdriver.ko

remove:
	sudo rmmod drunkdriver

install_drunkdriver: all
	install --owner root --group root --mode 700 drunkdriver.ko /lib/modules/$(shell uname -r)/kernel/drivers/net
	install --owner root --group root --mode 700 drunk /usr/sbin/drunk
	grep drunkdriver /etc/modules > /dev/null || echo drunkdriver >> /etc/modules
	depmod

drunkdriver.tar.gz:
	tar czf $@ -C .. DrunkDriver/drunkdriver.c DrunkDriver/Makefile DrunkDriver/drunk
