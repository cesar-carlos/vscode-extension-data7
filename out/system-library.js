"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_SYMBOLS = void 0;
const Collections_1 = require("./system-library/Collections/Collections");
const StringList_1 = require("./system-library/Collections/StringList");
const CodEmpresa_1 = require("./system-library/Data7/CodEmpresa");
const CodFilial_1 = require("./system-library/Data7/CodFilial");
const CodPeriodoCaixa_1 = require("./system-library/Data7/CodPeriodoCaixa");
const CodUsuario_1 = require("./system-library/Data7/CodUsuario");
const Criptografar_1 = require("./system-library/Data7/Criptografar");
const Data7_1 = require("./system-library/Data7/Data7");
const Descriptografar_1 = require("./system-library/Data7/Descriptografar");
const NomeArquivoExecutavel_1 = require("./system-library/Data7/NomeArquivoExecutavel");
const NomeUsuario_1 = require("./system-library/Data7/NomeUsuario");
const Parametro_1 = require("./system-library/Data7/Parametro");
const PesquisaPadrao_1 = require("./system-library/Data7/PesquisaPadrao");
const ProximoCodigo_1 = require("./system-library/Data7/ProximoCodigo");
const ProximoID_1 = require("./system-library/Data7/ProximoID");
const ValorPorExtenso_1 = require("./system-library/Data7/ValorPorExtenso");
const ValorPorExtensoLinha1_1 = require("./system-library/Data7/ValorPorExtensoLinha1");
const ValorPorExtensoLinha2_1 = require("./system-library/Data7/ValorPorExtensoLinha2");
const Drawing_1 = require("./system-library/Drawing/Drawing");
const TCanvas_1 = require("./system-library/Drawing/TCanvas");
const TPen_1 = require("./system-library/Drawing/TPen");
const Environment_1 = require("./system-library/Environment/Environment");
const Execute_1 = require("./system-library/Environment/Execute");
const MachineName_1 = require("./system-library/Environment/MachineName");
const UserName_1 = require("./system-library/Environment/UserName");
const CustomControl_1 = require("./system-library/Forms/CustomControl");
const Form_1 = require("./system-library/Forms/Form");
const Forms_1 = require("./system-library/Forms/Forms");
const Grid_1 = require("./system-library/Forms/Grid");
const Imagem_1 = require("./system-library/Forms/Imagem");
const MessageBox_1 = require("./system-library/Forms/MessageBox");
const ProcessMessages_1 = require("./system-library/Forms/ProcessMessages");
const StaticText_1 = require("./system-library/Forms/StaticText");
const TAlign_1 = require("./system-library/Forms/TAlign");
const TAlignment_1 = require("./system-library/Forms/TAlignment");
const TBoundLabel_1 = require("./system-library/Forms/TBoundLabel");
const TLabeledEdit_1 = require("./system-library/Forms/TLabeledEdit");
const TMargins_1 = require("./system-library/Forms/TMargins");
const TWinControl_1 = require("./system-library/Forms/TWinControl");
const alBottom_1 = require("./system-library/Globals/alBottom");
const alClient_1 = require("./system-library/Globals/alClient");
const alLeft_1 = require("./system-library/Globals/alLeft");
const alNone_1 = require("./system-library/Globals/alNone");
const alRight_1 = require("./system-library/Globals/alRight");
const alTop_1 = require("./system-library/Globals/alTop");
const Base64ToFile_1 = require("./system-library/Globals/Base64ToFile");
const CDbl_1 = require("./system-library/Globals/CDbl");
const Char_1 = require("./system-library/Globals/Char");
const CInt_1 = require("./system-library/Globals/CInt");
const CStr_1 = require("./system-library/Globals/CStr");
const DateTime_1 = require("./system-library/Globals/DateTime");
const FileToBase64_1 = require("./system-library/Globals/FileToBase64");
const InStr_1 = require("./system-library/Globals/InStr");
const LCase_1 = require("./system-library/Globals/LCase");
const Left_1 = require("./system-library/Globals/Left");
const Mid_1 = require("./system-library/Globals/Mid");
const RGB_1 = require("./system-library/Globals/RGB");
const Space_1 = require("./system-library/Globals/Space");
const taCenter_1 = require("./system-library/Globals/taCenter");
const taLeftJustify_1 = require("./system-library/Globals/taLeftJustify");
const taRightJustify_1 = require("./system-library/Globals/taRightJustify");
const THTTP_1 = require("./system-library/Globals/THTTP");
const Timer_1 = require("./system-library/Globals/Timer");
const TJSONArray_1 = require("./system-library/Globals/TJSONArray");
const TJSONObject_1 = require("./system-library/Globals/TJSONObject");
const TLSv1_1 = require("./system-library/Globals/TLSv1");
const TLSv1_1_1 = require("./system-library/Globals/TLSv1_1");
const TLSv1_2_1 = require("./system-library/Globals/TLSv1_2");
const TLSv1_3_1 = require("./system-library/Globals/TLSv1_3");
const TObject_1 = require("./system-library/Globals/TObject");
const TryStrToInt_1 = require("./system-library/Globals/TryStrToInt");
const UCase_1 = require("./system-library/Globals/UCase");
const ZipFile_1 = require("./system-library/Globals/ZipFile");
const Directory_1 = require("./system-library/IO/Directory");
const File_1 = require("./system-library/IO/File");
const IO_1 = require("./system-library/IO/IO");
const Boolean_1 = require("./system-library/Primitives/Boolean");
const Date_1 = require("./system-library/Primitives/Date");
const Double_1 = require("./system-library/Primitives/Double");
const Integer_1 = require("./system-library/Primitives/Integer");
const Single_1 = require("./system-library/Primitives/Single");
const String_1 = require("./system-library/Primitives/String");
const TDateTime_1 = require("./system-library/Primitives/TDateTime");
const Command_1 = require("./system-library/SQL/Command");
const Connection_1 = require("./system-library/SQL/Connection");
const SQL_1 = require("./system-library/SQL/SQL");
const TFDParam_1 = require("./system-library/SQL/TFDParam");
const TField_1 = require("./system-library/SQL/TField");
const IOUtils_1 = require("./system-library/System/IOUtils");
const System_1 = require("./system-library/System/System");
const IXMLNode_1 = require("./system-library/XML/IXMLNode");
const TXMLDocument_1 = require("./system-library/XML/TXMLDocument");
const XML_1 = require("./system-library/XML/XML");
const System_Classes_1 = require("./system-library/System.Classes/System.Classes");
const TObject_2 = require("./system-library/System.Classes/TObject");
const TPersistent_1 = require("./system-library/System.Classes/TPersistent");
const TPersistent_2 = require("./system-library/Globals/TPersistent");
const TStrings_1 = require("./system-library/Collections/TStrings");
const TStringList_1 = require("./system-library/Collections/TStringList");
exports.SYSTEM_SYMBOLS = [
    ...Collections_1.symbols,
    ...StringList_1.symbols,
    ...CodEmpresa_1.symbols,
    ...CodFilial_1.symbols,
    ...CodPeriodoCaixa_1.symbols,
    ...CodUsuario_1.symbols,
    ...Criptografar_1.symbols,
    ...Data7_1.symbols,
    ...Descriptografar_1.symbols,
    ...NomeArquivoExecutavel_1.symbols,
    ...NomeUsuario_1.symbols,
    ...Parametro_1.symbols,
    ...PesquisaPadrao_1.symbols,
    ...ProximoCodigo_1.symbols,
    ...ProximoID_1.symbols,
    ...ValorPorExtenso_1.symbols,
    ...ValorPorExtensoLinha1_1.symbols,
    ...ValorPorExtensoLinha2_1.symbols,
    ...Drawing_1.symbols,
    ...TCanvas_1.symbols,
    ...TPen_1.symbols,
    ...Environment_1.symbols,
    ...Execute_1.symbols,
    ...MachineName_1.symbols,
    ...UserName_1.symbols,
    ...CustomControl_1.symbols,
    ...Form_1.symbols,
    ...Forms_1.symbols,
    ...Grid_1.symbols,
    ...Imagem_1.symbols,
    ...MessageBox_1.symbols,
    ...ProcessMessages_1.symbols,
    ...StaticText_1.symbols,
    ...TAlign_1.symbols,
    ...TAlignment_1.symbols,
    ...TBoundLabel_1.symbols,
    ...TLabeledEdit_1.symbols,
    ...TMargins_1.symbols,
    ...TWinControl_1.symbols,
    ...alBottom_1.symbols,
    ...alClient_1.symbols,
    ...alLeft_1.symbols,
    ...alNone_1.symbols,
    ...alRight_1.symbols,
    ...alTop_1.symbols,
    ...Base64ToFile_1.symbols,
    ...CDbl_1.symbols,
    ...Char_1.symbols,
    ...CInt_1.symbols,
    ...CStr_1.symbols,
    ...DateTime_1.symbols,
    ...FileToBase64_1.symbols,
    ...InStr_1.symbols,
    ...LCase_1.symbols,
    ...Left_1.symbols,
    ...Mid_1.symbols,
    ...RGB_1.symbols,
    ...Space_1.symbols,
    ...taCenter_1.symbols,
    ...taLeftJustify_1.symbols,
    ...taRightJustify_1.symbols,
    ...THTTP_1.symbols,
    ...Timer_1.symbols,
    ...TJSONArray_1.symbols,
    ...TJSONObject_1.symbols,
    ...TLSv1_1.symbols,
    ...TLSv1_1_1.symbols,
    ...TLSv1_2_1.symbols,
    ...TLSv1_3_1.symbols,
    ...TObject_1.symbols,
    ...TryStrToInt_1.symbols,
    ...UCase_1.symbols,
    ...ZipFile_1.symbols,
    ...Directory_1.symbols,
    ...File_1.symbols,
    ...IO_1.symbols,
    ...Boolean_1.symbols,
    ...Date_1.symbols,
    ...Double_1.symbols,
    ...Integer_1.symbols,
    ...Single_1.symbols,
    ...String_1.symbols,
    ...TDateTime_1.symbols,
    ...Command_1.symbols,
    ...Connection_1.symbols,
    ...SQL_1.symbols,
    ...TFDParam_1.symbols,
    ...TField_1.symbols,
    ...IOUtils_1.symbols,
    ...System_1.symbols,
    ...IXMLNode_1.symbols,
    ...TXMLDocument_1.symbols,
    ...XML_1.symbols,
    ...System_Classes_1.symbols,
    ...TObject_2.symbols,
    ...TPersistent_1.symbols,
    ...TPersistent_2.symbols,
    ...TStrings_1.symbols,
    ...TStringList_1.symbols
];
//# sourceMappingURL=system-library.js.map