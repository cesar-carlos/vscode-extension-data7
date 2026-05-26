import { SystemSymbolInfo } from "../types";

export const symbols: SystemSymbolInfo[] = [
  {
    "name": "RDBMS",
    "kind": "method",
    "type": "String",
    "isShared": true,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Connection",
    "description": "Retorna o tipo de RDBMS ativo no ERP (ex: ASA, MSSQL, POSTGRESQL)."
  },
  {
    "name": "Connection",
    "kind": "class",
    "type": "Connection",
    "isShared": true,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "SQL",
    "description": "Classe global que representa a conexão atual com o banco de dados."
  }
];
