import { SystemSymbolInfo } from "../types";

export const symbols: SystemSymbolInfo[] = [
  {
    "name": "IXMLNode",
    "kind": "class",
    "type": "XML.IXMLNode",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "XML",
    "description": "Nó individual de um documento XML contendo propriedades, atributos e nós filhos."
  },
  {
    "name": "NodeValue",
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
    "containerName": "IXMLNode",
    "description": "Lê ou configura o valor de texto contido neste nó."
  },
  {
    "name": "Attributes",
    "kind": "method",
    "type": "String",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pAttrName",
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
    "containerName": "IXMLNode",
    "description": "Lê ou define o valor do atributo XML indicado pelo nome."
  },
  {
    "name": "AddChild",
    "kind": "method",
    "type": "XML.IXMLNode",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pTagName",
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
    "containerName": "IXMLNode",
    "description": "Adiciona e retorna um novo nó filho com o nome de tag informado."
  },
  {
    "name": "ChildNodes",
    "kind": "method",
    "type": "Variant",
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
    "containerName": "IXMLNode",
    "description": "Lista e provê acesso aos nós filhos deste nó."
  },
  {
    "name": "GetNodeName",
    "kind": "method",
    "type": "String",
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
    "containerName": "IXMLNode",
    "description": "Retorna o nome da tag XML correspondente a este nó."
  },
  {
    "name": "SelectSingleNode",
    "kind": "method",
    "type": "XML.IXMLNode",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pXPath",
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
    "containerName": "IXMLNode",
    "description": "Busca e retorna um único nó utilizando a query XPath informada."
  }
];
