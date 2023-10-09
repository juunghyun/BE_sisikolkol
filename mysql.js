let mysql = require("mysql2");

var db_info = {
    host: "localhost", // 데이터베이스 주소
    port: "3306", // 데이터베이스 포트
    user: "root", // 로그인 계정
    password: "dlwjdgus1234", // 비밀번호
    database: "sisikolkol_db", // 엑세스할 데이터베이스
};

module.exports = {
    init: function () {
        return mysql.createConnection(db_info);
    },
    connect: function (conn) {
        conn.connect(function (err) {
            if (err) console.error("mysql connection error : " + err);
            else console.log("mysql is connected successfully!");
        });
    },
};