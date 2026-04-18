-- Длинный комментарий к заказу (раньше VARCHAR(191) ломал оформление при длинном тексте)
ALTER TABLE `Order` MODIFY `comment` TEXT NULL;
