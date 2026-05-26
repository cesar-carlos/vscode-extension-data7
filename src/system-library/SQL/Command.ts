import { SystemSymbolInfo } from "../types";

export const symbols: SystemSymbolInfo[] = [
  {
    "name": "CommandText",
    "kind": "property",
    "type": "String",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Define ou obtém a instrução SQL a ser executada."
  },
  {
    "name": "Open",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Executa a query e abre o cursor de resultados."
  },
  {
    "name": "Close",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Fecha o cursor de resultados e libera recursos da query."
  },
  {
    "name": "Field",
    "kind": "method",
    "type": "TField",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pName",
        "type": "String",
        "isByRef": false,
        "isOptional": false
      }
    ],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Retorna o objeto de campo para leitura do valor retornado na coluna especificada."
  },
  {
    "name": "ExecSQL",
    "kind": "method",
    "type": "Integer",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Executa uma instrução DML ou DDL no banco de dados. Retorna a quantidade de registros afetados."
  },
  {
    "name": "Param",
    "kind": "method",
    "type": "TFDParam",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pParamName",
        "type": "String",
        "isByRef": false,
        "isOptional": false
      }
    ],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Param é utilizado para definir o valor de um parâmetro em tempo de execução."
  },
  {
    "name": "IsEmpty",
    "kind": "method",
    "type": "Boolean",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Retorna True caso não existam registros no conjunto de dados."
  },
  {
    "name": "First",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Move o cursor para o primeiro registro do conjunto de dados."
  },
  {
    "name": "Last",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Move o cursor para o último registro do conjunto de dados."
  },
  {
    "name": "Next",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Move o cursor para o próximo registro do conjunto de dados."
  },
  {
    "name": "Prior",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Move o cursor para o registro anterior do conjunto de dados."
  },
  {
    "name": "SaveToFile",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pFileName",
        "type": "String",
        "isByRef": false,
        "isOptional": false
      }
    ],
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Salva os registros do conjunto de dados em um arquivo. Por padrão a extensão do arquivo é XML."
  },
  {
    "name": "Bof",
    "kind": "property",
    "type": "Boolean",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Quando Bof é True, indica que o cursor está na primeira linha de um conjunto de dados."
  },
  {
    "name": "Eof",
    "kind": "property",
    "type": "Boolean",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Quando Eof é True, indica que o cursor está na última linha de um conjunto de dados."
  },
  {
    "name": "RowsAffected",
    "kind": "property",
    "type": "Integer",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Command",
    "description": "Indica a quantidade de registros no conjunto de dados."
  },
  {
    "name": "Command",
    "kind": "class",
    "type": "Command",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "SQL",
    "description": "Classe para execução de queries e comandos SQL no ERP."
  }
];
