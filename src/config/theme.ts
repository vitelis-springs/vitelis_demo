import { theme } from 'antd';

export const antdTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#58bfce',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#58bfce',
    borderRadius: 6,
    wireframe: false,
    // Dark theme colors
    colorBgContainer: '#1f1f1f',
    colorBgElevated: '#262626',
    colorBgLayout: '#141414',
    colorBgSpotlight: '#262626',
    colorBgMask: 'rgba(0, 0, 0, 0.65)',
    colorText: '#d9d9d9',
    colorTextSecondary: '#8c8c8c',
    colorTextTertiary: '#737373',
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    // Spacing
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
    // Padding
    paddingXS: 8,
    paddingSM: 12,
    padding: 16,
    paddingMD: 20,
    paddingLG: 24,
    paddingXL: 32,
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      fontSize: 14,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 36,
      fontSize: 14,
    },
    Card: {
      borderRadius: 8,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
    },
    Table: {
      borderRadius: 6,
      headerBg: '#262626',
      headerColor: '#d9d9d9',
    },
    Modal: {
      borderRadius: 8,
      headerBg: '#1f1f1f',
    },
    Select: {
      borderRadius: 6,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 6,
      controlHeight: 36,
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemHoverBg: '#1f1f1f',
      darkItemSelectedBg: '#1f1f1f',
      darkItemSelectedColor: '#58bfce',
    },
    Layout: {
      siderBg: '#001529',
      headerBg: '#001529',
      bodyBg: '#141414',
    },
  },
};

// Light theme variant (for reference)
export const antdLightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#58bfce',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#58bfce',
    borderRadius: 6,
    wireframe: false,
    // Light theme colors
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgSpotlight: '#ffffff',
    colorBgMask: 'rgba(0, 0, 0, 0.45)',
    colorText: '#262626',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    // Spacing
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
    // Padding
    paddingXS: 8,
    paddingSM: 12,
    padding: 16,
    paddingMD: 20,
    paddingLG: 24,
    paddingXL: 32,
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      fontSize: 14,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 36,
      fontSize: 14,
    },
    Card: {
      borderRadius: 8,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    },
    Table: {
      borderRadius: 6,
      headerBg: '#fafafa',
      headerColor: '#262626',
    },
    Modal: {
      borderRadius: 8,
      headerBg: '#ffffff',
    },
    Select: {
      borderRadius: 6,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 6,
      controlHeight: 36,
    },
  },
};
