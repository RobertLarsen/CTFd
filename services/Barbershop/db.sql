drop database if exists barbershop;
create database barbershop;
connect barbershop;
create table users(
    id integer primary key auto_increment,
    name varchar(32) unique,
    password varchar(128)
);
create table appointments(
    timestamp integer primary key,
    userid integer,
    foreign key(userid) references users(id)
);
create index userid_idx on appointments(userid);
create index auth_idx on users(name, password);
GRANT INSERT, DELETE, UPDATE, SELECT ON *.* TO 'benjamin'@'%' IDENTIFIED BY 'barker';

insert into users values(1, "robert", "secret");
insert into users values(2, "benjamin", "barker");
insert into appointments values(1282546800, 1);
insert into appointments values(1282564800, 2);
insert into appointments values(1282651200, 2);
insert into appointments values(1283169600, 2);
