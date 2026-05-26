import { SymbolInfo } from "./symbol-indexer";
import { symbols as sym_0 } from "./system-library/Collections/Collections";
import { symbols as sym_1 } from "./system-library/Collections/StringList";
import { symbols as sym_2 } from "./system-library/Data7/CodEmpresa";
import { symbols as sym_3 } from "./system-library/Data7/CodFilial";
import { symbols as sym_4 } from "./system-library/Data7/CodPeriodoCaixa";
import { symbols as sym_5 } from "./system-library/Data7/CodUsuario";
import { symbols as sym_6 } from "./system-library/Data7/Criptografar";
import { symbols as sym_7 } from "./system-library/Data7/Data7";
import { symbols as sym_8 } from "./system-library/Data7/Descriptografar";
import { symbols as sym_9 } from "./system-library/Data7/NomeArquivoExecutavel";
import { symbols as sym_10 } from "./system-library/Data7/NomeUsuario";
import { symbols as sym_11 } from "./system-library/Data7/Parametro";
import { symbols as sym_12 } from "./system-library/Data7/PesquisaPadrao";
import { symbols as sym_13 } from "./system-library/Data7/ProximoCodigo";
import { symbols as sym_14 } from "./system-library/Data7/ProximoID";
import { symbols as sym_15 } from "./system-library/Data7/ValorPorExtenso";
import { symbols as sym_16 } from "./system-library/Data7/ValorPorExtensoLinha1";
import { symbols as sym_17 } from "./system-library/Data7/ValorPorExtensoLinha2";
import { symbols as sym_18 } from "./system-library/Drawing/Drawing";
import { symbols as sym_19 } from "./system-library/Drawing/TCanvas";
import { symbols as sym_20 } from "./system-library/Drawing/TPen";
import { symbols as sym_21 } from "./system-library/Environment/Environment";
import { symbols as sym_22 } from "./system-library/Environment/Execute";
import { symbols as sym_23 } from "./system-library/Environment/MachineName";
import { symbols as sym_24 } from "./system-library/Environment/UserName";
import { symbols as sym_25 } from "./system-library/Forms/CustomControl";
import { symbols as sym_26 } from "./system-library/Forms/Form";
import { symbols as sym_27 } from "./system-library/Forms/Forms";
import { symbols as sym_28 } from "./system-library/Forms/Grid";
import { symbols as sym_29 } from "./system-library/Forms/Imagem";
import { symbols as sym_30 } from "./system-library/Forms/MessageBox";
import { symbols as sym_31 } from "./system-library/Forms/ProcessMessages";
import { symbols as sym_32 } from "./system-library/Forms/StaticText";
import { symbols as sym_33 } from "./system-library/Forms/TAlign";
import { symbols as sym_34 } from "./system-library/Forms/TAlignment";
import { symbols as sym_35 } from "./system-library/Forms/TBoundLabel";
import { symbols as sym_36 } from "./system-library/Forms/TLabeledEdit";
import { symbols as sym_37 } from "./system-library/Forms/TMargins";
import { symbols as sym_38 } from "./system-library/Forms/TWinControl";
import { symbols as sym_39 } from "./system-library/Globals/alBottom";
import { symbols as sym_40 } from "./system-library/Globals/alClient";
import { symbols as sym_41 } from "./system-library/Globals/alLeft";
import { symbols as sym_42 } from "./system-library/Globals/alNone";
import { symbols as sym_43 } from "./system-library/Globals/alRight";
import { symbols as sym_44 } from "./system-library/Globals/alTop";
import { symbols as sym_45 } from "./system-library/Globals/Base64ToFile";
import { symbols as sym_46 } from "./system-library/Globals/CDbl";
import { symbols as sym_47 } from "./system-library/Globals/Char";
import { symbols as sym_48 } from "./system-library/Globals/CInt";
import { symbols as sym_49 } from "./system-library/Globals/CStr";
import { symbols as sym_50 } from "./system-library/Globals/DateTime";
import { symbols as sym_51 } from "./system-library/Globals/FileToBase64";
import { symbols as sym_52 } from "./system-library/Globals/InStr";
import { symbols as sym_53 } from "./system-library/Globals/LCase";
import { symbols as sym_54 } from "./system-library/Globals/Left";
import { symbols as sym_55 } from "./system-library/Globals/Mid";
import { symbols as sym_56 } from "./system-library/Globals/RGB";
import { symbols as sym_57 } from "./system-library/Globals/Space";
import { symbols as sym_58 } from "./system-library/Globals/taCenter";
import { symbols as sym_59 } from "./system-library/Globals/taLeftJustify";
import { symbols as sym_60 } from "./system-library/Globals/taRightJustify";
import { symbols as sym_61 } from "./system-library/Globals/THTTP";
import { symbols as sym_62 } from "./system-library/Globals/Timer";
import { symbols as sym_63 } from "./system-library/Globals/TJSONArray";
import { symbols as sym_64 } from "./system-library/Globals/TJSONObject";
import { symbols as sym_65 } from "./system-library/Globals/TLSv1";
import { symbols as sym_66 } from "./system-library/Globals/TLSv1_1";
import { symbols as sym_67 } from "./system-library/Globals/TLSv1_2";
import { symbols as sym_68 } from "./system-library/Globals/TLSv1_3";
import { symbols as sym_69 } from "./system-library/Globals/TObject";
import { symbols as sym_70 } from "./system-library/Globals/TryStrToInt";
import { symbols as sym_71 } from "./system-library/Globals/UCase";
import { symbols as sym_72 } from "./system-library/Globals/ZipFile";
import { symbols as sym_73 } from "./system-library/IO/Directory";
import { symbols as sym_74 } from "./system-library/IO/File";
import { symbols as sym_75 } from "./system-library/IO/IO";
import { symbols as sym_76 } from "./system-library/Primitives/Boolean";
import { symbols as sym_77 } from "./system-library/Primitives/Date";
import { symbols as sym_78 } from "./system-library/Primitives/Double";
import { symbols as sym_79 } from "./system-library/Primitives/Integer";
import { symbols as sym_80 } from "./system-library/Primitives/Single";
import { symbols as sym_81 } from "./system-library/Primitives/String";
import { symbols as sym_82 } from "./system-library/Primitives/TDateTime";
import { symbols as sym_83 } from "./system-library/SQL/Command";
import { symbols as sym_84 } from "./system-library/SQL/Connection";
import { symbols as sym_85 } from "./system-library/SQL/SQL";
import { symbols as sym_86 } from "./system-library/SQL/TFDParam";
import { symbols as sym_87 } from "./system-library/SQL/TField";
import { symbols as sym_88 } from "./system-library/System/IOUtils";
import { symbols as sym_89 } from "./system-library/System/System";
import { symbols as sym_90 } from "./system-library/XML/IXMLNode";
import { symbols as sym_91 } from "./system-library/XML/TXMLDocument";
import { symbols as sym_92 } from "./system-library/XML/XML";
import { symbols as sym_93 } from "./system-library/System.Classes/System.Classes";
import { symbols as sym_94 } from "./system-library/System.Classes/TObject";
import { symbols as sym_95 } from "./system-library/System.Classes/TPersistent";
import { symbols as sym_96 } from "./system-library/Globals/TPersistent";
import { symbols as sym_97 } from "./system-library/Collections/TStrings";
import { symbols as sym_98 } from "./system-library/Collections/TStringList";

export const SYSTEM_SYMBOLS: SymbolInfo[] = [
  ...sym_0,
  ...sym_1,
  ...sym_2,
  ...sym_3,
  ...sym_4,
  ...sym_5,
  ...sym_6,
  ...sym_7,
  ...sym_8,
  ...sym_9,
  ...sym_10,
  ...sym_11,
  ...sym_12,
  ...sym_13,
  ...sym_14,
  ...sym_15,
  ...sym_16,
  ...sym_17,
  ...sym_18,
  ...sym_19,
  ...sym_20,
  ...sym_21,
  ...sym_22,
  ...sym_23,
  ...sym_24,
  ...sym_25,
  ...sym_26,
  ...sym_27,
  ...sym_28,
  ...sym_29,
  ...sym_30,
  ...sym_31,
  ...sym_32,
  ...sym_33,
  ...sym_34,
  ...sym_35,
  ...sym_36,
  ...sym_37,
  ...sym_38,
  ...sym_39,
  ...sym_40,
  ...sym_41,
  ...sym_42,
  ...sym_43,
  ...sym_44,
  ...sym_45,
  ...sym_46,
  ...sym_47,
  ...sym_48,
  ...sym_49,
  ...sym_50,
  ...sym_51,
  ...sym_52,
  ...sym_53,
  ...sym_54,
  ...sym_55,
  ...sym_56,
  ...sym_57,
  ...sym_58,
  ...sym_59,
  ...sym_60,
  ...sym_61,
  ...sym_62,
  ...sym_63,
  ...sym_64,
  ...sym_65,
  ...sym_66,
  ...sym_67,
  ...sym_68,
  ...sym_69,
  ...sym_70,
  ...sym_71,
  ...sym_72,
  ...sym_73,
  ...sym_74,
  ...sym_75,
  ...sym_76,
  ...sym_77,
  ...sym_78,
  ...sym_79,
  ...sym_80,
  ...sym_81,
  ...sym_82,
  ...sym_83,
  ...sym_84,
  ...sym_85,
  ...sym_86,
  ...sym_87,
  ...sym_88,
  ...sym_89,
  ...sym_90,
  ...sym_91,
  ...sym_92,
  ...sym_93,
  ...sym_94,
  ...sym_95,
  ...sym_96,
  ...sym_97,
  ...sym_98
];
