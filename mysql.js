let mysql = require("mysql2");
require('dotenv').config(); // .env 파일을 읽어 환경 변수로 설정

let db_info = {
    host: process.env.DATABASE_HOST, // 데이터베이스 주소
    port: "3306", // 데이터베이스 포트
    user: process.env.DATABASE_USERNAME, // 로그인 계정
    password: process.env.DATABASE_PASSWORD, // 비밀번호
    database: process.env.DATABASE_NAME, // 엑세스할 데이터베이스
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