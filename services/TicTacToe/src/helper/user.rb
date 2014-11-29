#!/usr/bin/ruby

USER_DB="users.sqlite"
if not ARGV.size == 3 then
    puts "Usage: #{ARGV[0]} <create|authenticate> <username> <password>"
else
    if ['create', 'authenticate'].include? ARGV[0] then
        #Check if exists
        if not File.exists?(USER_DB) then
            `sqlite3 #{USER_DB} "create table users(id integer primary key autoincrement, name varchar(32), password varchar(64), unique(name))"`
        end

        if ARGV[0] == 'create' then

            `sqlite3 #{USER_DB} "insert into users(name, password) values('#{ARGV[1]}','#{ARGV[2]}')" 2>/dev/null`
            if not $?.to_i == 0 then
                $stderr.puts "Username taken"
                exit 1
            else
                $stdout.puts "User created"
                exit 0
            end
        else
            out=`sqlite3 #{USER_DB} "select id from users where name='#{ARGV[1]}' and password='#{ARGV[2]}'" 2>/dev/null`
            if not $?.to_i == 0 then
                $stderr.puts "Unknown error"
                exit 2
            elsif out == "" then
                $stderr.puts "No such user"
                exit 1
            else
                puts out.to_i
                exit 0
            end
        end
    else
        $stderr.puts "Unknown command: #{ARGV[0]}"
        exit 2
    end
end
