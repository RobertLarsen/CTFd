#!/usr/bin/ruby

require 'inotify'
require 'open3'

#system *%W(./helper/user.rb create blim blam)

USERD_IN = 'userd_in'
USER_HELPER = './helper/user.rb'

i = Inotify.new
i.add_watch(USERD_IN, Inotify::CLOSE_WRITE)
i.each_event do |event|
    if event.name[0] != '.' then
        fname = USERD_IN + '/' + event.name
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

        if content['name'] && content['password'] && content['action'] && content['resultfile'] && ['create','authenticate'].include?(content['action']) then
            Open3.popen3 *%W(#{USER_HELPER} #{content['action']} #{content['name']} #{content['password']}) do |stdin, stdout, stderr, w|
                res = w.value.exitstatus
                if res == 0 then
                    content['output'] = stdout.gets(nil)
                else
                    content['output'] = stderr.gets(nil)
                end
                if content['output'].nil? then
                    content['output'] = ''
                end
                content['output'].strip!
                stdout.close
                stderr.close
                stdin.close
                content['status'] = res
                puts content
                File.open(content['resultfile'], 'w') do |outfile|
                    content.each do |key, value|
                        outfile.write("#{key} = #{value}\n")
                    end
                end
            end
        end
    end
end
