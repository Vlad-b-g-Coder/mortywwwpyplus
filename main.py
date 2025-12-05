import pygame
import sys
import math
import os
from battle_scene import MortyBattle

pygame.init()

SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 675
LOGICAL_WIDTH = 1920
LOGICAL_HEIGHT = 1080

screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Игровое меню")

scale_x = SCREEN_WIDTH / LOGICAL_WIDTH
scale_y = SCREEN_HEIGHT / LOGICAL_HEIGHT
window_scale = min(scale_x, scale_y)

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)


class AnimatedButton:
    def __init__(self, x, y, scale, image_path, text="", text_scale=1, offset_x=0, offset_y=0, is_special=False):
        self.x = x
        self.y = y
        self.scale = scale
        self.text = text
        self.text_scale = text_scale
        self.offset_x = offset_x
        self.offset_y = offset_y
        self.is_special = is_special

        self.original_image = pygame.image.load(image_path).convert_alpha()
        self.image = self.original_image
        self.rect = self.image.get_rect(center=(x, y))

        self.pulse_min = 0.95
        self.pulse_max = 1.05
        self.pulse_time = 0
        self.pulse_duration = 2000  # мс

        self.apply_scale()

    def apply_scale(self):
        width = int(self.original_image.get_width() * self.scale * window_scale)
        height = int(self.original_image.get_height() * self.scale * window_scale)
        self.image = pygame.transform.scale(self.original_image, (width, height))
        self.rect = self.image.get_rect(center=(self.x * window_scale, self.y * window_scale))

    def update(self, dt):
        if not self.is_special:
            self.pulse_time = (self.pulse_time + dt) % self.pulse_duration
            progress = self.pulse_time / self.pulse_duration

            pulse_scale = self.pulse_min + (self.pulse_max - self.pulse_min) * math.sin(
                progress * math.pi * 2) * 0.5 + 0.5

            current_scale = self.scale * pulse_scale
            width = int(self.original_image.get_width() * current_scale * window_scale)
            height = int(self.original_image.get_height() * current_scale * window_scale)
            self.image = pygame.transform.scale(self.original_image, (width, height))
            self.rect = self.image.get_rect(center=(self.x * window_scale, self.y * window_scale))

    def draw(self, surface):
        surface.blit(self.image, self.rect)

        if self.text:
            font = pygame.font.SysFont('comicsansms', int(24 * self.text_scale * window_scale))
            text_surface = font.render(self.text, True, (0, 0, 0))
            text_rect = text_surface.get_rect(center=(
                self.rect.centerx + self.offset_x * window_scale,
                self.rect.centery + self.offset_y * window_scale
            ))
            surface.blit(text_surface, text_rect)

    def is_clicked(self, pos):
        return self.rect.collidepoint(pos)


class AnimatedBackground:
    def __init__(self, x, y, scale, image_path, rotation_speed=0.1, pulse_speed=0.001):
        self.x = x
        self.y = y
        self.scale = scale
        self.rotation_speed = rotation_speed
        self.pulse_speed = pulse_speed

        self.original_image = pygame.image.load(image_path).convert_alpha()
        self.image = self.original_image
        self.rect = self.image.get_rect(center=(x, y))

        self.rotation_angle = 0
        self.pulse_value = 0

        self.apply_scale()

    def apply_scale(self):
        width = int(self.original_image.get_width() * self.scale * window_scale)
        height = int(self.original_image.get_height() * self.scale * window_scale)
        self.image = pygame.transform.scale(self.original_image, (width, height))
        self.rect = self.image.get_rect(center=(self.x * window_scale, self.y * window_scale))

    def update(self, dt):
        self.rotation_angle -= self.rotation_speed * dt

        self.pulse_value += self.pulse_speed * dt
        pulse_scale = 1 + 0.02 * math.sin(self.pulse_value)

        current_scale = self.scale * pulse_scale
        width = int(self.original_image.get_width() * current_scale * window_scale)
        height = int(self.original_image.get_height() * current_scale * window_scale)

        scaled_image = pygame.transform.scale(self.original_image, (width, height))
        self.image = pygame.transform.rotate(scaled_image, self.rotation_angle)
        self.rect = self.image.get_rect(center=(self.x * window_scale, self.y * window_scale))

    def draw(self, surface):
        surface.blit(self.image, self.rect)


class StaticImage:
    def __init__(self, x, y, scale, image_path):
        self.x = x
        self.y = y
        self.scale = scale

        self.original_image = pygame.image.load(image_path).convert_alpha()
        self.image = self.original_image
        self.rect = self.image.get_rect(center=(x, y))

        self.apply_scale()

    def apply_scale(self):
        width = int(self.original_image.get_width() * self.scale * window_scale)
        height = int(self.original_image.get_height() * self.scale * window_scale)
        self.image = pygame.transform.scale(self.original_image, (width, height))
        self.rect = self.image.get_rect(center=(self.x * window_scale, self.y * window_scale))

    def draw(self, surface):
        surface.blit(self.image, self.rect)


fone = AnimatedBackground(960, 594, 1.8, "assets/images/menu/blueSpiral.png", rotation_speed=0.05)
portal = AnimatedBackground(960, 594, 1.5, "assets/images/menu/portal.png", rotation_speed=0.1, pulse_speed=0.005)
morty = StaticImage(960, 648, 2, "assets/images/menu/mortyPose.png")
play_button = AnimatedButton(960, 756, 1.2, "assets/images/menu/playBtnUp.png", "")
settings_button = AnimatedButton(1632, 1004, 1.5, "assets/images/menu/settingBtnUp.png", "", is_special=True)
logo = AnimatedButton(960, 162, 1.5, "assets/images/menu/logo.png", is_special=True)

drawable_objects = [fone, portal, morty, play_button, settings_button, logo]

transition_alpha = 0
transition_speed = 8
transition_state = "none"
next_scene = None
current_scene = "menu"
battle_instance = None

clock = pygame.time.Clock()
running = True

while running:
    dt = clock.tick(60)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        elif event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:
                mouse_pos = pygame.mouse.get_pos()

                if current_scene == "menu":
                    if play_button.is_clicked(mouse_pos):
                        transition_state = "fade_out"
                        next_scene = "battle"
                    elif settings_button.is_clicked(mouse_pos):
                        transition_state = "fade_out"
                        next_scene = "settings"

                elif current_scene == "battle" and battle_instance:
                    result = battle_instance.handle_event(event)
                    if result == "back_to_menu":
                        transition_state = "fade_out"
                        next_scene = "menu"

        elif event.type == pygame.KEYDOWN:
            if current_scene == "battle" and battle_instance:
                result = battle_instance.handle_event(event)
                if result == "back_to_menu":
                    transition_state = "fade_out"
                    next_scene = "menu"

    # Обновление объектов
    if current_scene == "menu":
        for obj in drawable_objects:
            if hasattr(obj, 'update'):
                obj.update(dt)
    elif current_scene == "battle" and battle_instance:
        battle_instance.update(dt)

    # переход между сценами
    if transition_state == "fade_out":
        transition_alpha += transition_speed
        if transition_alpha >= 255:
            transition_alpha = 255
            transition_state = "fade_in"

            if next_scene == "battle":
                battle_instance = MortyBattle(screen)
                current_scene = "battle"
            elif next_scene == "menu":
                current_scene = "menu"
                battle_instance = None

    elif transition_state == "fade_in":
        transition_alpha -= transition_speed
        if transition_alpha <= 0:
            transition_alpha = 0
            transition_state = "none"

    if current_scene == "menu":
        screen.fill(WHITE)
        for obj in drawable_objects:
            obj.draw(screen)

    elif current_scene == "battle" and battle_instance:
        battle_instance.draw()

    #  переход поверх всего
    if transition_alpha > 0:
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
        overlay.fill(BLACK)
        overlay.set_alpha(transition_alpha)
        screen.blit(overlay, (0, 0))

    pygame.display.flip()

pygame.quit()
sys.exit()