module.exports = {
    $schema: "http://json-schema.org/draft-06/schema#",
    $id: "sessions.json",
    title: "Sessions",
    dataSource: "membio_mls",
    tableName: "sessions",
    description: "Generated: Wed Mar 18 2020 11:06:45 GMT-0700 (Pacific Daylight Time)",
    primaryKey: "id",
    baseName : "session",
    route : "session",
    properties: {
        id: {
            type: "string",
            format: "uuid",
            allowNull: false,
            description: "",
            columnName: "id"
        },
        token: {
            type: "string",
            maxLength: 1000000,
            allowNull: true,
            description: "",
            columnName: "token"
        },
        updatedAt: {
            type: "string",
            format: "date-time",
            allowNull: true,
            description: "",
            columnName: "updated_at"
        },
        expiresAt: {
            type: "string",
            format: "date-time",
            allowNull: true,
            description: "",
            columnName: "expires_at"
        },
        createdAt: {
            type: "string",
            format: "date-time",
            allowNull: true,
            description: "",
            columnName: "created_at"
        },
        ipAddress: {
            type: "string",
            maxLength: 64,
            allowNull: true,
            description: "",
            columnName: "ip_address"
        },
        userId: {
            type: "string",
            format: "uuid",
            allowNull: true,
            description: "",
            columnName: "user_id"
        },
        userAgent: {
            type: "string",
            maxLength: 1000000,
            allowNull: true,
            description: "",
            columnName: "user_agent"
        },
        type: {
            type: "string",
            maxLength: 32,
            allowNull: true,
            description: "",
            columnName: "type"
        }
    },
    required: [
        "id"
    ],
    readOnly: [],
    type: "object",
    additionalProperties: false,
    updatedAt: "2020-03-18T18:06:48.857Z"
};
