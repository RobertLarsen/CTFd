drop database if exists socnetdb;
create database socnetdb;
connect socnetdb;

drop table if exists users;
create table `users`(
    id int primary key auto_increment,
    username varchar(32) unique,
    password varchar(64),
    gender tinyint
);

drop table if exists friendships;
create table friendships(
    user1 int,
    user2 int,
    confirmed tinyint default 0,
    primary key(user1, user2),
    foreign key(user1) references users(id),
    foreign key(user2) references users(id)
);

grant all privileges on socnetdb.* to 'socnet'@'%' identified by 'secret';
