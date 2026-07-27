import { AppError, assertPayloadSize, sanitizeText } from './security';

export const cleanAdminText = (value, maxLength = 5000) => sanitizeText(value, maxLength);

export const cleanRequiredAdminText = (value, fieldName, maxLength = 5000) => {
  const cleaned = cleanAdminText(value, maxLength);
  if (!cleaned) throw new AppError(`${fieldName} không được để trống.`);
  return cleaned;
};

export const cleanOptionalAdminText = (value, maxLength = 5000) => {
  const cleaned = cleanAdminText(value, maxLength);
  return cleaned || null;
};

export const assertPositiveInteger = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new AppError(`${fieldName} phải là số nguyên lớn hơn 0.`);
  }
  return number;
};

export const assertTimeRange = (startTime, endTime) => {
  const start = Number(startTime);
  const end = Number(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new AppError('Thời gian kết thúc phải lớn hơn thời gian bắt đầu.');
  }
  return { start, end };
};

export const normalizeSlug = (value) => {
  const slug = cleanRequiredAdminText(value, 'Slug', 120).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AppError('Slug chỉ gồm chữ thường, số và dấu gạch ngang.');
  }
  return slug;
};

export const normalizeYouTubeId = (value) => {
  const input = cleanRequiredAdminText(value, 'YouTube ID', 500);
  const directId = input.match(/^[A-Za-z0-9_-]{11}$/)?.[0];
  const urlId = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)?.[1];
  const youtubeId = directId || urlId;

  if (!youtubeId) {
    throw new AppError('YouTube ID hoặc URL video không hợp lệ.');
  }

  return youtubeId;
};

export const prepareAdminPayload = (payload) => {
  assertPayloadSize(payload);
  return payload;
};

export const requireAffectedRows = async (query, actionLabel) => {
  const { data, error } = await query;
  if (error) throw error;

  const affectedRows = Array.isArray(data) ? data.length : Number(Boolean(data));
  if (affectedRows === 0) {
    throw new AppError(`${actionLabel} không thành công. Bản ghi có thể đã bị xóa hoặc bạn không có quyền thao tác.`, 409);
  }

  return data;
};

export const deleteAdminContent = async (supabase, entity, id) => {
  const { error } = await supabase.rpc('admin_delete_content', {
    p_entity: entity,
    p_id: String(id),
  });

  if (error) throw error;
};
