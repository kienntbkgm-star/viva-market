import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#FF5733',
  background: 'white',
  white: '#ffffff',
  black: '#000000',
  title: '#333',
  text: '#666',
  inputBg: '#f9f9f9',
  border: '#ddd',
  shadow: '#000',
};

export const VALUES = {
  borderRadius: 12,
  margin: 25,
  marginSmall: 8,
  inputHeight: 55,
  fontSizeTitle: 24,
  fontSizeBody: 14,
};

export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  bigTitle: {
    fontSize: VALUES.fontSizeTitle,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 30,
    color: COLORS.title,
  },
  // Nút bấm cam dùng chung
  primaryBtn: {
    backgroundColor: COLORS.primary,
    height: VALUES.inputHeight,
    borderRadius: VALUES.borderRadius,
    marginHorizontal: VALUES.margin,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  btnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Link chuyển trang dùng chung
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.text,
    fontSize: 15,
  },
  linkHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  // Style cho giá tiền dùng chung
  priceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 // Khoảng cách giữa giá mới và giá cũ
  },
  pricePromo: { 
    color: COLORS.primary, 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  priceNormal: { 
    color: '#999', 
    textDecorationLine: 'line-through', 
    fontSize: 12 
  },
});