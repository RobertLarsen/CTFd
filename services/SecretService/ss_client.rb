#!/usr/bin/ruby

require 'socket'

def dump(obj, indent = 0)
    if obj.is_a? Array
        puts (' ' * (indent*4)) + '['
        obj.each do |v|
            dump v, (indent + 1)
        end
        puts (' '* (indent*4)) + ']'
    elsif obj.is_a? String
        puts (' ' * (indent*4)) + '"' + obj + '"'
    end
end

class Message
    def initialize()
        @args = Hash.new
    end

    def [](key)
        @args[key]
    end

    def []=(key, value)
        @args[key] = value
    end

    def to_s
        s = "<msg"
        @args.each {|key,value| s += " #{key}=\"#{value}\"" }
        s += "/>"
    end

    def self.parse(str)
        msg = nil
        if str =~ /<msg( (([a-z]+)="([^"]+)"))*\/>/ then
            msg = Message.new
            regex = /(([^ =]+)="([^"]+)")/
            res = str.scan(regex);
            res.each {|kv|
                key = kv[1]
                value = kv[2]
                msg[key] = value
            }
        end
        return msg
    end
end

#./ss_client.rb <host> <low port> <high port>

host = ARGV.shift
remote_ports = ((ARGV.shift.to_i)..(ARGV.shift.to_i)).to_a
cmd_args = Message.new
cmd_args['action'] = ARGV.shift
key = nil
value = nil
username = nil
password = nil

remote_port = remote_ports[rand(remote_ports.size)]


case cmd_args['action']
when 'put'
    cmd_args['key'] = ARGV.shift
    cmd_args['value'] = ARGV.shift
when 'get'
    cmd_args['key'] = ARGV.shift
when 'delete'
    cmd_args['key'] = ARGV.shift
when 'admin'
when 'iterate'
when 'num'
end

username = ARGV.shift
password = ARGV.shift

server = nil
local_port = nil

while server.nil? do
    begin
        ports = (10000..65535).to_a
        local_port = ports[rand(ports.size)]
        server = TCPServer.new(local_port)
    rescue => e
        p e.message
    end
end

keys = Message.new
keys['port'] = local_port
keys['user'] = username unless username.nil?
keys['pass'] = password unless password.nil?

udp_packet = keys.to_s

quit = Message.new
quit['action'] = 'quit'

UDPSocket.new.send(udp_packet, 0, host, remote_port)
client = server.accept
server.close
client.send("#{cmd_args.to_s}\n", 0)
client.send("#{quit.to_s}\n", 0)

exitcode=0
while line = client.gets
    msg = Message.parse(line)
    if msg['error'] then
        puts msg['error']
        exitcode=1
    elsif msg['admin'] then
        if msg['admin'] == 'yes' then
            puts "You are admin"
        else
            puts "You are not admin"
            exitcode=1
        end
    elsif msg['rows'] then
        puts msg['rows']
    elsif msg['key'] then
        puts "#{msg['key']}=#{msg['value']}"
    elsif msg['value'] then
        puts "#{msg['value']}"
    end
end
client.close
exit exitcode
