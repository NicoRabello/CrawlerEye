FROM php:8.2-apache
RUN apt-get update && apt-get install -y unzip curl
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
COPY . /var/www/html/
WORKDIR /var/www/html/
RUN composer install
RUN sed -i 's/80/10000/g' /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf
EXPOSE 10000