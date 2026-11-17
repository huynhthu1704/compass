import { useStore } from './store';

const VI: Record<string, string> = {
  'Projects': 'Dự án',
  'Products': 'Sản phẩm',
  'Your products': 'Sản phẩm của bạn',
  'New product': 'Sản phẩm mới',
  'Product home': 'Trang sản phẩm',
  'Knowledge base': 'Kho tri thức',
  'Ask product': 'Hỏi sản phẩm',
  'Ask': 'Hỏi',
  'New initiative': 'Sáng kiến mới',
  'Initiatives': 'Các sáng kiến',
  'Product knowledge': 'Tri thức sản phẩm',
  'BABOK library': 'Thư viện BABOK',
  'Overview': 'Tổng quan',
  'Next actions': 'Hành động tiếp theo',
  'Artefacts': 'Tài liệu đầu ra',
  'Backlog': 'Backlog',
  'Plan & Release': 'Kế hoạch & Phát hành',
  'Monitor': 'Theo dõi',
  'Traceability': 'Truy vết',
  'Knowledge': 'Kiến thức BABOK',
  'Settings': 'Cài đặt',
  'New project': 'Dự án mới',
  'What outcome does the business want?': 'Doanh nghiệp muốn đạt được kết quả gì?',
  'Suggested next actions': 'Gợi ý hành động tiếp theo',
  'Recommended': 'Đề xuất',
  'Generate': 'Tạo kết quả',
  'Ask me more questions': 'Hỏi thêm tôi',
  'Skip': 'Bỏ qua',
  'Continue': 'Tiếp tục',
  'Back': 'Quay lại',
  'Approve': 'Duyệt',
  'Export': 'Xuất file',
  'Your projects': 'Dự án của bạn',
  'Recommended next action': 'Hành động được đề xuất',
  'Life cycle': 'Vòng đời sản phẩm',
  'Change log': 'Nhật ký thay đổi',
  'Usage': 'Mức sử dụng',
  'Role': 'Vai trò',
};

export function useT() {
  const { settings } = useStore();
  return (s: string) => (settings.lang === 'vi' ? VI[s] || s : s);
}
