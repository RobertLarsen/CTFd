create table users(
    `id` int primary key auto_increment,
    `name` varchar(32) unique,
    `password` varchar(64),
    `type`  enum('user', 'admin') default 'user'
);

create table posts(
    `id` int primary key auto_increment,
    `parent_id` int,
    `poster_id` int,
    `time` timestamp default CURRENT_TIMESTAMP,
    `subject` varchar(128),
    `body` text
);
