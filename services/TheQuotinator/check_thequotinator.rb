#!/usr/bin/ruby

require 'socket'

def help
    puts "Usage:"
    puts "   #{__FILE__} -p <host> <port> <flagname> <flagdata>   - Plant a flag"
    puts "   #{__FILE__} -c <host> <port> <flagname> <flagdata>   - Check a flag"
    puts "   #{__FILE__} -e <host> <port>                         - Check for exploitability"
    exit
end

def plant host, port, name, data
    begin
        s = TCPSocket.open(host, port)
        s.write("ADDQUOTE \"#{name}\" #{data.length}\r\n#{data}\r\n")
        if s.gets.strip == "Quote received" then
            puts "Flag planted"
        else
            puts "Flag could not be planted"
            exit 1
        end
    rescue Exception => e
        puts "Exception"
        exit 1
    end
    exit 0
end

def check host, port, name, data
    begin
        s = TCPSocket.open(host, port)
        s.write("QUOTE \"#{name}\" 1\r\n")
        if s.gets.strip == data then
            puts "Flag intact"
        else
            puts "Flag is not intact"
            exit 1
        end
    rescue Exception => e
        puts "Exception"
        exit 1
    end
    exit 0
end

help if ARGV.length < 1

case
when ARGV[0] == "-p"
    help if ARGV.length < 5
    plant ARGV[1], ARGV[2], ARGV[3], ARGV[4]
when ARGV[0] == "-c"
    help if ARGV.length < 5
    check ARGV[1], ARGV[2], ARGV[3], ARGV[4]
when ARGV[0] == "-e"
    help if ARGV.length < 3
    puts "Not yet implemented"
end
