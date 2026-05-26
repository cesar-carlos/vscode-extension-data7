import { SystemSymbolInfo } from "../types";

export const symbols: SystemSymbolInfo[] = [
  {
    "name": "ColCount",
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
    "containerName": "Forms.Grid",
    "description": "Quantidade de colunas visíveis na grade."
  },
  {
    "name": "RowCount",
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
    "containerName": "Forms.Grid",
    "description": "Quantidade de linhas visíveis na grade."
  },
  {
    "name": "TotalColCount",
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
    "containerName": "Forms.Grid",
    "description": "Exibe o total de colunas da grade."
  },
  {
    "name": "TotalRowCount",
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
    "containerName": "Forms.Grid",
    "description": "Exibe o total de linhas da grade."
  },
  {
    "name": "Cells",
    "kind": "method",
    "type": "String",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Utilize para definir ou obter o valor da célula especificada nos parâmetros."
  },
  {
    "name": "IsHiddenColumn",
    "kind": "method",
    "type": "Boolean",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Retorna true caso a coluna esteja oculta na grade."
  },
  {
    "name": "IsHiddenRow",
    "kind": "method",
    "type": "Boolean",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Retorna true caso a linha esteja oculta na grade."
  },
  {
    "name": "AddRow",
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
    "containerName": "Forms.Grid",
    "description": "Adiciona uma linha na grade."
  },
  {
    "name": "ClearNormalCells",
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
    "containerName": "Forms.Grid",
    "description": "Limpa todas as células da grade."
  },
  {
    "name": "DeleteColumn",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exclui a coluna especificada."
  },
  {
    "name": "DeleteRow",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exclui a linha especificada."
  },
  {
    "name": "HideColumn",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Oculta uma coluna da grade."
  },
  {
    "name": "HideColumns",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pStartCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pEndCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Oculta múltiplas colunas da grade."
  },
  {
    "name": "HideRow",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Oculta uma linha da grade."
  },
  {
    "name": "HideRows",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pStartRow",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pEndRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Oculta múltiplas linhas da grade."
  },
  {
    "name": "LoadFromXLS",
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
    "containerName": "Forms.Grid",
    "description": "Preenche a grade com os dados de um arquivo XLS."
  },
  {
    "name": "RemoveCols",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pStartCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pCount",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exclui múltiplas colunas conforme os parâmetros especificados."
  },
  {
    "name": "RemoveRows",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pStartRow",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pCount",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exclui múltiplas linhas conforme os parâmetros especificados."
  },
  {
    "name": "RowHeight",
    "kind": "method",
    "type": "Integer",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Define ou obtém a altura da linha."
  },
  {
    "name": "SetMergeCells",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pStartCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pStartRow",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pColCount",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pRowCount",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Mescla as células de acordo com os parâmetros especificados."
  },
  {
    "name": "UnHideColumn",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exibe uma coluna oculta na grade."
  },
  {
    "name": "UnHideColumns",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pStartCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pEndCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exibe colunas ocultas de acordo com os parâmetros informados."
  },
  {
    "name": "UnHideColumnsAll",
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
    "containerName": "Forms.Grid",
    "description": "Exibe todas as colunas ocultas."
  },
  {
    "name": "UnHideRow",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exibe uma linha oculta."
  },
  {
    "name": "UnHideRows",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pStartRow",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pEndRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Exibe linhas ocultas de acordo com os parâmetros informados."
  },
  {
    "name": "CellColor",
    "kind": "method",
    "type": "Integer",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Utilize para definir ou obter a cor da célula especificada nos parâmetros."
  },
  {
    "name": "ColAlignment",
    "kind": "method",
    "type": "TAlignment",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Utilize para definir ou obter o alinhamento da coluna especificada no parâmetro."
  },
  {
    "name": "ColWidth",
    "kind": "method",
    "type": "Integer",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Utilize para definir ou obter a largura da coluna especificada no parâmetro."
  },
  {
    "name": "FontColor",
    "kind": "method",
    "type": "Integer",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Utilize para definir ou obter a cor da fonte na célula especificada nos parâmetros."
  },
  {
    "name": "FontName",
    "kind": "method",
    "type": "String",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Utilize para definir ou obter o nome da fonte da célula especificada."
  },
  {
    "name": "FontSize",
    "kind": "method",
    "type": "Integer",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pCol",
        "type": "Integer",
        "isByRef": false,
        "isOptional": false
      },
      {
        "name": "pRow",
        "type": "Integer",
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
    "containerName": "Forms.Grid",
    "description": "Utilize para definir ou obter o tamanho da fonte da célula especificada."
  },
  {
    "name": "Grid",
    "kind": "class",
    "type": "Forms.Grid",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "Forms",
    "inheritsFrom": "TWinControl",
    "description": "Componente de grade (Grid) para exibição e manipulação de tabelas."
  }
];
