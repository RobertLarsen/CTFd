#!/usr/bin/ruby

require 'socket'
require 'securerandom'
require 'inotify'

TTTD_IN = 'tttd_in'
USERD_IN = 'userd_in'

class TTTGame
    attr_reader :current
    def initialize(player1, player2)
        @player1, @player2, @current, @grid = player1, player2, player1, [' ', ' ', ' ',
                                                                          ' ', ' ', ' ',
                                                                          ' ', ' ', ' ']
        player1.send("You are now playing against #{player2.user_name}")
        player2.send("You are now playing against #{player1.user_name}")
        send("#{@current.user_name}, make your move")
    end

    def count_token(token)
        count = 0
        @grid.each do |t|
            count += 1 if t == token
        end
        count
    end

    def user_token(user)
        if user == @player1 then
            return 'O'
        else
            return 'X'
        end
    end

    def count_current_token
        count_token current_user_token
    end

    def current_user_token
        user_token @current
    end

    def next_user
        if @current == @player1 then
            return @player2
        else
            return @player1
        end
    end

    def send(msg)
        @player1.send(msg)
        @player2.send(msg)
    end

    def [](x,y)
        @grid[(y - 1) * 3 + (x - 1)]
    end

    def has_token_won?(token)
        3.times do |i|
            return true if self[i + 1, 1] == token && self[i + 1, 2] == token && self[i + 1, 3] == token
            return true if self[1, i + 1] == token && self[2, i + 1] == token && self[3, i + 1] == token
        end
        return true if self[1,1] == token && self[2,2] == token && self[3,3] == token
        return true if self[3,1] == token && self[2,2] == token && self[1,3] == token
    end

    def has_current_won?
        has_token_won? current_user_token
    end

    def remove(x, y)
        if x >= 1 and x < 4 && y >= 1 && y < 4 then
            idx = (y - 1) * 3 + (x - 1)
            if @grid[idx] == current_user_token then
                @grid[idx] = ' ' 
                send("#{@current.user_name} removed #{x},#{y}")
                send(to_s)
                send("#{@current.user_name}, make your move")
            else
                @current.send('That spot is not yours.')
            end
        else
            @current.send("Coordinates are outside bounds.")
        end
    end

    def place(x, y)
        if x >= 1 and x < 4 && y >= 1 && y < 4 then
            idx = (y - 1) * 3 + (x - 1)
            if @grid[idx] == ' ' then
                @grid[idx] = current_user_token
                send("#{@current.user_name} placed #{x},#{y}")
                send(to_s)
                if has_current_won? then
                    send("#{@current.user_name} has won the game")
                    @player1.game = nil
                    @player2.game = nil
                else
                    @current = next_user
                    send("#{@current.user_name}, make your move")
                end
            else
                @current.send('That spot is not empty.')
            end
        else
            @current.send("Coordinates are outside bounds.")
        end
    end

    def disconnected(player)
        other = @player1 if player == @player2
        other = @player2 if player == @player1
        other.send("#{player.user_name} has disconnected...you win")
        other.game = nil
    end

    def to_s
        "+---+\n" +
        "|" + @grid[0] + @grid[1] + @grid[2] + "|\n" +
        "|" + @grid[3] + @grid[4] + @grid[5] + "|\n" +
        "|" + @grid[6] + @grid[7] + @grid[8] + "|\n" +
        "+---+\n"
    end
end

def parse_args(str)
    outside = 0
    in_str = 1
    in_quoted = 2

    args = []
    b = 0
    s = outside
    str.size.times do |i|
        if s == outside && (str[i] !~ /\s/) then
            b = i
            if str[i] == '"' then
                b += 1
                s = in_quoted
            else
                s = in_str
            end
        elsif s == in_str && str[i] =~ /\s/ then
            args.push(str[b, i - b])
            s = outside
        elsif s == in_quoted && str[i] == '"' then
            args.push(str[b, i - b])
            s = outside
        end
    end
    if s != outside then
        args.push(str[b, str.size])
    end

    return args
end

class TTTClient
    attr_reader :uuid, :state, :user_name
    attr_accessor :game, :socket
    STATE_CONNECTED = 0
    STATE_DISCONNECTING = 1
    STATE_DISCONNECTED = 2
    STATE_AUTHENTICATED = 3

    def initialize(socket, server)
        @socket, @server, @buffer, @state, @uuid, @user_id, @user_name, @game = socket, server, '', -1, SecureRandom.uuid, nil, nil, nil
        set_state(TTTClient::STATE_CONNECTED)
    end

    def send(msg)
        begin
            @socket.send("#{msg}\n", 0) unless (@socket.nil? or @state == TTTClient::STATE_DISCONNECTING)
        rescue
            @state = TTTClient::STATE_DISCONNECTING
        end
    end

    def set_state(new_state)
        @state = new_state
        case @state
            when TTTClient::STATE_CONNECTED
                send("Hello and welcome to TicTacToe\nCreate a user account or log in to play a game")
            when TTTClient::STATE_DISCONNECTED
                if not @game.nil? then
                    @game.disconnected(self)
                end
            when TTTClient::STATE_AUTHENTICATED
                send("Welcome back #{@user_name}.")
                send("You have successfully authenticated.")
            when TTTClient::STATE_DISCONNECTING
                send("Goodbye")
            else
                puts "Unknown"
        end
    end

    def drain
        if not @state == TTTClient::STATE_DISCONNECTING then
            data = ''
            begin
                again = true
                while again do
                    d = @socket.recv_nonblock 1024
                    if d.size == 0
                        @state = TTTClient::STATE_DISCONNECTING
                        again = false
                        data = nil
                    else
                        data += d
                    end
                end
            rescue Errno::ECONNRESET
                data = nil
            rescue IO::WaitReadable
            end
            if not data.nil? then
                @buffer += data
            end
            return data
        end
    end

    def each_line
        again = true
        while again do
            i = @buffer.index("\n")
            if i.nil? then
                again = false
            else
                s = @buffer[0,i]
                @buffer = @buffer[i + 1, @buffer.size]
                yield s.strip
            end
        end
    end

    def create_user(name, password)
        File.open("#{USERD_IN}/create-#{@uuid}", "w") do |f|
            f.write("uuid = #{@uuid}\n")
            f.write("action = create\n")
            f.write("resultfile = #{TTTD_IN}/create-#{@uuid}\n")
            f.write("name = #{name}\n")
            f.write("password = #{password}\n")
        end
    end

    def login(name, password)
        File.open("#{USERD_IN}/login-#{@uuid}", "w") do |f|
            f.write("uuid = #{@uuid}\n")
            f.write("action = authenticate\n")
            f.write("resultfile = #{TTTD_IN}/login-#{@uuid}\n")
            f.write("name = #{name}\n")
            f.write("password = #{password}\n")
        end
    end

    def play(name)
        if not @game.nil? then
            send('You can only play one game at a time.')
        elsif @user_name == name then
            send('No, you cannot play against yourself!')
        else
            other = @server.client_by_name(name)
            if other.nil? then
                send("#{name} is not connected.")
            elsif not other.game.nil?
                send("#{name} already plays a game.")
            else
                @game = other.game = TTTGame.new(self, other)
            end
        end
    end

    def handle_command(command, args)
        if @state == TTTClient::STATE_CONNECTED && ['quit', 'create_user', 'login'].include?(command) == false then
            send("Create user account or login first!")
        elsif @state != TTTClient::STATE_CONNECTED && ['create_user', 'login'].include?(command) then
            send("You can not do that after having logged in.")
        else
            case command
                when 'create_user'
                    if args.length != 2 then
                        send('You need to specify a username and a password')
                    else
                        create_user(args[0], args[1])
                    end
                when 'login'
                    if args.length != 2 then
                        send('You need to specify a username and a password')
                    else
                        login(args[0], args[1])
                    end
                when 'quit'
                    set_state(TTTClient::STATE_DISCONNECTING)
                when 'play'
                    if args.length != 1 then
                        send('You need to specify the name of a user to play against')
                    else
                        play(args[0])
                    end
                when 'place'
                    if @game.nil? then
                        send('You are not currently playing a game')
                    elsif @game.current != self then
                        send('It is not your turn')
                    elsif @game.count_current_token == 3
                        send('You have three tokens on the board. Remove one first.')
                    elsif args.length != 2 then
                        send('You need to specify the X and Y coordinate to place upon.')
                    else
                        @game.place(args[0].to_i, args[1].to_i)
                    end
                when 'remove'
                    if @game.nil? then
                        send('You are not currently playing a game')
                    elsif @game.current != self then
                        send('It is not your turn')
                    elsif @game.count_current_token != 3
                        send('You must have three tokens on the board in order to remove.')
                    elsif args.length != 2 then
                        send('You need to specify the X and Y coordinate to place upon.')
                    else
                        @game.remove(args[0].to_i, args[1].to_i)
                    end
                else
                    send("Unknown command #{command}")
            end
        end
    end

    def event(data)
        if data['action'] then
            case data['action']
                when 'create'
                    if data['status'].to_i == 0 then
                        send('You have created a user. Now log in.')
                    else
                        send("User creation failed: #{data['output']}")
                    end
                when 'authenticate'
                    if data['status'].to_i == 0 then
                        @user_id = data['output'].to_i
                        @user_name = data['name']
                        set_state(TTTClient::STATE_AUTHENTICATED)
                    else
                        send("Login failed: #{data['output']}")
                    end
            end
        end
    end

    def handle_line(line)
        i = line.index(' ')
        if i.nil? then
            cmd = line
            args = []
        else
            cmd = line[0,i]
            args = parse_args(line[i + 1, line.size])
        end
        handle_command(cmd, args)
    end
end

class TTTServer
    def initialize(bind_addr = '0.0.0.0', bind_port = 7878)
        @server = TCPServer.new bind_addr, bind_port
        @clients = {}
        @uuids_to_client = {}
    end

    def client_by_uuid(uuid)
        c = @uuids_to_client[uuid]
        yield c if block_given? && c
        c
    end

    def client_by_name(name)
        @clients.each_value do |client|
            return client if client.user_name == name
        end
        nil
    end

    def run
        r_set = [@server]
        while true do
            rs, ws, es = IO::select(r_set)
            rs.each do |s|
                if s == @server then
                    client = @server.accept_nonblock
                    r_set.push(client)
                    @clients[client.to_s] = TTTClient.new(client, self)
                    @uuids_to_client[@clients[client.to_s].uuid] = @clients[client.to_s]
                else
                    client = @clients[s.to_s]
                    data = client.drain
                    if data.nil? then
                        client.set_state(TTTClient::STATE_DISCONNECTING)
                    else
                        client.each_line do |line|
                            if line.size > 0 then
                                client.handle_line line
                            end
                        end
                    end
                end
            end
            made_change = true
            while made_change do
                made_change = false
                @clients.each_value do |client|
                    if client.state == TTTClient::STATE_DISCONNECTING then
                        made_change = true
                        client.socket.close
                        r_set.delete(client.socket)
                        @clients.delete(client.socket.to_s)
                        client.socket = nil
                        @uuids_to_client.delete(client.uuid)
                        client.set_state(TTTClient::STATE_DISCONNECTED)
                    end
                end
            end
        end
    end
end

server = TTTServer.new
Thread.new do
    i = Inotify.new
    i.add_watch(TTTD_IN, Inotify::CLOSE_WRITE)
    i.each_event do |event|
        if event.name[0] != '.' then
            fname = TTTD_IN + '/' + event.name
            content = {}
            file = File.open(fname)
            file.each_line do |line|
                line.strip!
                parts = line.split(/\s*=\s*/)
                if parts.size == 2 then
                    content[parts[0]] = parts[1]
                end
            end
            file.close
            File.delete(fname)
            if content['uuid'] then
                server.client_by_uuid(content['uuid']) do |client|
                    client.event(content)
                end
            end
        end
    end
end
server.run
