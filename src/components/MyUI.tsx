// @ts-nocheck
import React from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS, GlobalStyles, VALUES } from '../styles/GlobalStyles';

// Định nghĩa kiểu dữ liệu cho Input để hết gạch đỏ
interface MyInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  isPass?: boolean;
  keyboard?: KeyboardTypeOptions;
}

export const MyInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  isPass = false, 
  keyboard = 'default' 
}: MyInputProps) => (
  <View style={styles.inputWrapper}>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={isPass}
      keyboardType={keyboard}
      autoCapitalize="none"
    />
  </View>
);

// Định nghĩa kiểu dữ liệu cho Button
interface MyButtonProps {
  title: string;
  onPress: () => void;
  style?: any;
}

export const MyButton = ({ title, onPress, style }: MyButtonProps) => (
  <TouchableOpacity 
    style={[GlobalStyles.primaryBtn, style]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={GlobalStyles.btnText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  inputWrapper: {
    height: VALUES.inputHeight,
    marginHorizontal: VALUES.margin,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: VALUES.borderRadius,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  input: {
    fontSize: 16,
    color: COLORS.black,
    height: '100%',
  },
});